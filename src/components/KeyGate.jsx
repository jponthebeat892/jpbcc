import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function KeyGate({ open, onOpenChange, fingerprint, targetLabel, mode, busy, error, onSubmit }) {
  const [code, setCode] = useState('');

  useEffect(() => {
    if (open) setCode('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card/95 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-primary">
            <KeyRound className="h-3.5 w-3.5" />
            Channel key required
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] text-muted-foreground">
            {mode === 'session'
              ? 'Enter the long term key for this channel to unlock every block for this session.'
              : `Enter the long term key to decrypt ${targetLabel || 'this block'}. Nothing is revealed until the key matches.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
            spellCheck={false}
            placeholder="JP-XXXXX-XXXXX-XXXXX-XXXXX"
            className="h-11 font-mono text-[13px] uppercase tracking-[0.12em]"
          />

          {fingerprint ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Fingerprint {fingerprint}
            </p>
          ) : null}

          {error ? (
            <p className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
              <ShieldAlert className="h-3 w-3" />
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              onClick={() => onSubmit(code)}
              disabled={busy || code.trim().length < 4}
              className="h-9 flex-1 gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
              Decrypt
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}