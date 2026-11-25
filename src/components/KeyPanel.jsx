import React, { useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function KeyPanel({ conversation }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const key = conversation?.key_code || '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      toast({ title: 'Channel key copied', description: 'Keep it out of the terminal history.' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: 'Copy failed', description: 'Reveal the key and copy it manually.' });
    }
  };

  return (
    <div className="border border-border/70 bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-3 w-3 text-primary" />
        <p className="term-label">Channel key</p>
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="ml-auto text-muted-foreground hover:text-primary"
          aria-label="Toggle key visibility"
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={copy}
          className="text-muted-foreground hover:text-primary"
          aria-label="Copy channel key"
        >
          {copied ? <RefreshCw className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <p className="mt-2 break-all font-mono text-[12px] tracking-[0.1em] text-foreground">
        {visible ? key : '••••••••-••••-••••-••••'}
      </p>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        Fingerprint {conversation?.key_fingerprint || '—'}
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        Emailed to both operators when the channel opened.
      </p>
    </div>
  );
}