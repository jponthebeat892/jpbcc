import React, { useEffect, useRef, useState } from 'react';
import { Eye, Flame, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EncryptedMedia from '@/components/EncryptedMedia';
import { decryptText } from '@/lib/cipher';
import { formatBytes, formatClock, kindLabel } from '@/lib/format';

const BURN_SECONDS = 60;

export default function CipherBlock({ message, myId, unlockedKey, sessionKey, onRequestKey, onBurn, onSaveEncrypted }) {
  const key = unlockedKey || sessionKey;
  const mine = message.sender_id === myId;
  const burned = (message.burned_by || []).includes(myId);
  const isMedia = message.kind !== 'text' && message.kind !== 'document';

  const [caption, setCaption] = useState('');
  const [failed, setFailed] = useState(false);
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!key || !message.cipher || failed) return;
    let active = true;
    decryptText(key, message.cipher, message.iv)
      .then((value) => {
        if (active) setCaption(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [key, message.id, message.cipher, message.iv, failed]);

  useEffect(() => {
    if (!key || !isMedia || burned) return;
    setRemaining(BURN_SECONDS);
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [key, isMedia, burned, message.id]);

  const firedRef = useRef(false);
  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onBurn(message);
    }
  }, [remaining, message, onBurn]);

  if (burned) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
        <Flame className="h-3 w-3" />
        Block self-destructed on this terminal
      </div>
    );
  }

  return (
    <div className={`term-panel p-3 rise ${mine ? 'ml-auto max-w-[92%] border-primary/25' : 'max-w-[92%]'}`}>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-foreground">@{mine ? 'you' : message.sender_handle || 'operator'}</span>
        <span>·</span>
        <span>{kindLabel(message.kind)}</span>
        {message.file_size ? (
          <>
            <span>·</span>
            <span>{formatBytes(message.file_size)}</span>
          </>
        ) : null}
        <span className="ml-auto">{formatClock(message.created_date)}</span>
      </div>

      {!key ? (
        <div className="mt-3 space-y-3">
          <p className="cipher max-h-24 overflow-hidden">{message.cipher || 'block'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onRequestKey(message)}
              className="h-8 gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              <Eye className="h-3 w-3" />
              View
            </Button>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              sealed — channel key required
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {failed ? (
            <p className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
              <ShieldAlert className="h-3 w-3" />
              Key rejected — block stayed sealed
            </p>
          ) : null}

          {message.kind === 'text' && caption ? (
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{caption}</p>
          ) : null}

          {message.kind === 'text' && !caption && !failed ? (
            <p className="font-mono text-[11px] text-muted-foreground">Decrypting…</p>
          ) : null}

          {isMedia ? <EncryptedMedia message={message} channelKey={key} /> : null}

          {message.kind === 'document' ? (
            <div className="space-y-2">
              <p className="font-mono text-[11px] text-foreground">{message.file_name}</p>
              <Button
                onClick={() => onSaveEncrypted(message, key)}
                className="h-8 font-mono text-[10px] uppercase tracking-[0.16em]"
              >
                Download encrypted packet
              </Button>
              <p className="font-mono text-[10px] text-muted-foreground">
                Opens only through the vault with this channel key.
              </p>
            </div>
          ) : null}

          {caption && message.kind !== 'text' ? (
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{caption}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
            {isMedia || message.kind === 'document' ? (
              <span className="flex items-center gap-1.5 text-accent">
                <Flame className="h-3 w-3" />
                {remaining !== null ? `self-destruct in ${remaining}s` : 'self-destruct armed'}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onBurn(message)}
              className="flex items-center gap-1.5 uppercase tracking-[0.14em] hover:text-destructive"
            >
              <Flame className="h-3 w-3" />
              burn now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}