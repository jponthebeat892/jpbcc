import React, { useRef, useState } from 'react';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';

export default function MessageComposer({ onSend, busy }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const submit = async () => {
    if (busy) return;
    if (!text.trim() && !file) return;
    const payload = { text, file };
    setText('');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    await onSend(payload);
  };

  return (
    <div className="term-panel p-3">
      {file ? (
        <div className="mb-2 flex items-center gap-2 border border-border/70 bg-background/50 px-3 py-2 font-mono text-[11px] text-foreground">
          <Paperclip className="h-3 w-3 text-primary" />
          <span className="truncate">{file.name}</span>
          <span className="text-muted-foreground">{formatBytes(file.size)}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <label className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
          <Paperclip className="h-3.5 w-3.5" />
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
          }}
          rows={2}
          placeholder="Type a block — it is encrypted before it leaves this terminal"
          className="min-h-[42px] flex-1 resize-none border border-input bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
        />

        <Button
          onClick={submit}
          disabled={busy || (!text.trim() && !file)}
          className="h-9 gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Seal
        </Button>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        AES-256-GCM · 25 MB per attachment · pictures, video and audio self-destruct after viewing
      </p>
    </div>
  );
}