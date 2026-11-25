import React, { useEffect, useState } from 'react';
import { Film, Image as ImageIcon, Loader2, Music, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { decryptBytes } from '@/lib/cipher';

const ICONS = { image: ImageIcon, video: Film, audio: Music };

export default function EncryptedMedia({ message, channelKey }) {
  const [state, setState] = useState('loading');
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    (async () => {
      try {
        const response = await base44.functions.invoke('getMediaUrl', { message_id: message.id });
        const signed = response.data?.signed_url;
        if (!signed) throw new Error('locked');

        const file = await fetch(signed, { cache: 'no-store' });
        const buffer = await file.arrayBuffer();
        const plain = await decryptBytes(channelKey, buffer, message.file_iv);

        objectUrl = URL.createObjectURL(
          new Blob([plain], { type: message.file_type || 'application/octet-stream' })
        );
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setUrl(objectUrl);
        setState('ready');
      } catch (error) {
        if (active) setState('error');
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message.id, channelKey]);

  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2 border border-border/70 bg-background/50 px-3 py-4 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Decrypting stream…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
        <ShieldAlert className="h-3.5 w-3.5" />
        Stream sealed — key mismatch
      </div>
    );
  }

  if (message.kind === 'image') {
    return (
      <img
        src={url}
        alt={message.file_name || 'encrypted picture'}
        className="max-h-[420px] w-full border border-border/70 object-contain"
      />
    );
  }

  if (message.kind === 'video') {
    return <video src={url} controls className="max-h-[420px] w-full border border-border/70 bg-black" />;
  }

  if (message.kind === 'audio') {
    return <audio src={url} controls className="w-full" />;
  }

  const Icon = ICONS[message.kind] || Film;
  return (
    <a
      href={url}
      download={message.file_name || true}
      className="flex items-center gap-2 border border-border/70 bg-background/50 px-3 py-2 font-mono text-[11px] text-primary hover:border-primary/40"
    >
      <Icon className="h-3.5 w-3.5" />
      {message.file_name || 'attachment'}
    </a>
  );
}