import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Loader2, ShieldAlert, Unlock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { Button } from '@/components/ui/button';
import CipherBlock from '@/components/CipherBlock';
import KeyGate from '@/components/KeyGate';
import KeyPanel from '@/components/KeyPanel';
import MessageComposer from '@/components/MessageComposer';
import { counterpartOf } from '@/lib/connections';
import {
  decryptText,
  deriveChannelKey,
  encryptBytes,
  encryptText,
  kindFromFile,
  packEncryptedFile,
  previewOf,
} from '@/lib/cipher';
import { toast } from '@/components/ui/use-toast';

const MAX_ATTACHMENT = 25 * 1024 * 1024;

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sealed, setSealed] = useState(false);
  const [sessionKey, setSessionKey] = useState(null);
  const [unlockedKeys, setUnlockedKeys] = useState({});
  const [gate, setGate] = useState({ open: false, message: null, mode: 'single' });
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const channel = await base44.entities.Conversation.get(id);
      setConversation(channel);
      setSealed(false);
      const page = await base44.entities.Message.filter(
        { conversation_id: id },
        { sort: 'created_date', limit: 200 }
      );
      setMessages(page.items || []);
      base44.entities.Message
        .updateMany(
          { conversation_id: id, read_by: { $ne: user.id } },
          { $addToSet: { read_by: user.id } }
        )
        .catch(() => {});
    } catch (error) {
      setSealed(true);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      const data = event?.data;
      const targetId = data?.id || event?.id;
      if (!targetId) return;
      if (event.type === 'delete') {
        setMessages((prev) => prev.filter((message) => message.id !== targetId));
        return;
      }
      if (!data || data.conversation_id !== id) return;
      setMessages((prev) =>
        prev.some((message) => message.id === data.id)
          ? prev.map((message) => (message.id === data.id ? { ...message, ...data } : message))
          : [...prev, data]
      );
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleRequestKey = (message) => {
    setGateError('');
    setGate({ open: true, message, mode: 'single' });
  };

  const handleUnlockSession = () => {
    if (messages.length === 0) {
      toast({ title: 'Nothing sealed yet', description: 'Send or receive a block first.' });
      return;
    }
    setGateError('');
    setGate({ open: true, message: messages[messages.length - 1], mode: 'session' });
  };

  const submitGate = async (value) => {
    if (!value?.trim() || !conversation) return;
    setGateBusy(true);
    setGateError('');
    try {
      const key = await deriveChannelKey(value, conversation.id);
      if (gate.message?.cipher) {
        await decryptText(key, gate.message.cipher, gate.message.iv);
      }
      if (gate.mode === 'session') {
        setSessionKey(key);
      } else if (gate.message) {
        setUnlockedKeys((prev) => ({ ...prev, [gate.message.id]: key }));
      }
      setGate({ open: false, message: null, mode: 'single' });
    } catch (error) {
      setGateError('Key rejected — the block stayed sealed');
    } finally {
      setGateBusy(false);
    }
  };

  const handleBurn = useCallback(
    async (message) => {
      if (!conversation || !user) return;
      const burned = Array.from(new Set([...(message.burned_by || []), user.id]));
      const others = (conversation.participants || []).filter((participant) => participant !== user.id);
      const everyoneDone = others.length > 0 && others.every((participant) => burned.includes(participant));

      setMessages((prev) =>
        prev.map((entry) => (entry.id === message.id ? { ...entry, burned_by: burned } : entry))
      );

      try {
        if (everyoneDone) {
          await base44.entities.Message.delete(message.id);
          setMessages((prev) => prev.filter((entry) => entry.id !== message.id));
        } else {
          await base44.entities.Message.update(message.id, { burned_by: burned });
        }
      } catch (error) {
        /* the block is already gone from this terminal */
      }
    },
    [conversation, user]
  );

  const handleSaveEncrypted = async (message) => {
    try {
      const response = await base44.functions.invoke('getMediaUrl', { message_id: message.id });
      const signed = response.data?.signed_url;
      if (!signed) throw new Error('locked');
      const buffer = await (await fetch(signed, { cache: 'no-store' })).arrayBuffer();
      const packed = packEncryptedFile({
        conversationId: conversation.id,
        fileName: message.file_name || 'attachment',
        fileType: message.file_type || 'application/octet-stream',
        iv: message.file_iv,
        data: new Uint8Array(buffer),
      });
      const url = URL.createObjectURL(new Blob([packed], { type: 'application/octet-stream' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${message.file_name || 'attachment'}.jpbcc`;
      anchor.click();
      URL.revokeObjectURL(url);
      await handleBurn(message);
      toast({
        title: 'Encrypted packet saved',
        description: 'It opens only through the vault with this channel key.',
      });
    } catch (error) {
      toast({ title: 'Download failed', description: 'The attachment could not be unlocked.' });
    }
  };

  const handleSend = async ({ text, file }) => {
    if (!conversation || !user) return;
    setSending(true);
    try {
      const key = await deriveChannelKey(conversation.key_code, conversation.id);
      const caption = String(text || '').trim() || (file ? file.name : '');
      const { cipher, iv } = await encryptText(key, caption);

      const payload = {
        conversation_id: conversation.id,
        participants: conversation.participants,
        sender_id: user.id,
        sender_handle: profile?.username || 'operator',
        kind: 'text',
        cipher,
        iv,
        read_by: [user.id],
        burned_by: [],
      };

      if (file) {
        if (file.size > MAX_ATTACHMENT) throw new Error('Attachments must be 25 MB or smaller.');
        const kind = kindFromFile(file);
        const encrypted = await encryptBytes(key, await file.arrayBuffer());
        const upload = await base44.integrations.Core.UploadPrivateFile({
          file: new File([encrypted.data], `jpblk_${Date.now()}.jpbcc`, {
            type: 'application/octet-stream',
          }),
        });
        Object.assign(payload, {
          kind,
          file_uri: upload.file_uri,
          file_iv: encrypted.iv,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });
      }

      const created = await base44.entities.Message.create(payload);
      setMessages((prev) => (prev.some((entry) => entry.id === created.id) ? prev : [...prev, created]));
      await base44.entities.Conversation.update(conversation.id, {
        last_message_at: new Date().toISOString(),
        last_preview: previewOf(cipher),
        message_count: (conversation.message_count || 0) + 1,
      });
      setConversation((prev) => (prev ? { ...prev, message_count: (prev.message_count || 0) + 1 } : prev));
    } catch (error) {
      toast({ title: 'Block not sent', description: error.message || 'The channel refused the block.' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="term-panel flex items-center gap-2 p-6 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Opening channel…
      </div>
    );
  }

  if (sealed || !conversation) {
    return (
      <div className="term-panel p-6">
        <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-destructive">
          <ShieldAlert className="h-4 w-4" />
          Channel sealed
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You are not one of the two authorized operators for this channel, so nothing here can be read.
        </p>
        <Link to="/">
          <Button className="mt-4 h-9 font-mono text-[10px] uppercase tracking-[0.18em]">Back to terminal</Button>
        </Link>
      </div>
    );
  }

  const counterpart = counterpartOf(conversation, user.id);

  return (
    <div className="space-y-5">
      <section className="term-panel term-panel-top p-4 rise">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="font-mono text-[12px] text-foreground">@{counterpart.handle}</p>
            <p className="term-label mt-1">Encrypted channel · two authorized operators</p>
          </div>
          <Button
            onClick={handleUnlockSession}
            variant="outline"
            disabled={Boolean(sessionKey)}
            className="ml-auto h-8 gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
          >
            {sessionKey ? <Unlock className="h-3 w-3 text-primary" /> : <KeyRound className="h-3 w-3" />}
            {sessionKey ? 'Session unlocked' : 'Unlock session'}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <KeyPanel conversation={conversation} />
          <div className="border border-border/70 bg-background/50 p-3">
            <p className="term-label">Terminal rules</p>
            <ul className="mt-2 space-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <li>· view asks for the channel key every time</li>
              <li>· pictures, video, audio burn 60s after decrypt</li>
              <li>· documents leave as .jpbcc packets</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {messages.length === 0 ? (
          <div className="term-panel p-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Channel empty — send the first sealed block
          </div>
        ) : (
          messages.map((message) => (
            <CipherBlock
              key={message.id}
              message={message}
              myId={user.id}
              sessionKey={sessionKey}
              unlockedKey={unlockedKeys[message.id]}
              onRequestKey={handleRequestKey}
              onBurn={handleBurn}
              onSaveEncrypted={handleSaveEncrypted}
            />
          ))
        )}
        <div ref={bottomRef} />
      </section>

      <MessageComposer onSend={handleSend} busy={sending} />

      <KeyGate
        open={gate.open}
        onOpenChange={(open) => setGate((prev) => ({ ...prev, open }))}
        fingerprint={conversation.key_fingerprint}
        targetLabel={gate.message ? `this ${gate.message.kind} block` : 'this block'}
        mode={gate.mode}
        busy={gateBusy}
        error={gateError}
        onSubmit={submitGate}
      />
    </div>
  );
}