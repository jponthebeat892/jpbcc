import React, { useState } from 'react';
import { FileLock2, KeyRound, Loader2, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { decryptBytes, deriveChannelKey, unpackEncryptedFile } from '@/lib/cipher';

export default function Vault() {
  const [file, setFile] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const push = (line) => setLog((prev) => [...prev.slice(-9), line]);

  const unlock = async () => {
    if (!file || !code.trim()) return;
    setBusy(true);
    setLog([]);
    try {
      push(`> reading ${file.name}`);
      const { header, payload } = await unpackEncryptedFile(await file.arrayBuffer());
      push(`> channel ${String(header.salt).slice(0, 8)}… packet recognised`);
      const key = await deriveChannelKey(code, header.salt);
      push('> deriving key from channel key');
      const plain = await decryptBytes(key, payload, header.iv);
      push('> decryption succeeded');
      const url = URL.createObjectURL(new Blob([plain], { type: header.type || 'application/octet-stream' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = header.name || 'decrypted-file';
      anchor.click();
      URL.revokeObjectURL(url);
      push('> payload released to your downloads');
    } catch (error) {
      push('! key rejected — the packet stayed locked');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="term-panel term-panel-top p-5 rise">
        <p className="term-label">Offline unlock</p>
        <h1 className="mt-2 font-display text-lg tracking-[0.14em] text-foreground glow-text">
          THE VAULT<span className="caret" />
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Documents and attachments downloaded from a channel arrive as encrypted .jpbcc packets.
          Nothing inside them is readable until you feed them back here with the long term channel key.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="term-panel p-5">
          <p className="term-label flex items-center gap-2">
            <FileLock2 className="h-3 w-3 text-primary" />
            Encrypted packet
          </p>

          <label className="mt-3 flex cursor-pointer items-center gap-3 border border-dashed border-border px-4 py-6 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
            <FileLock2 className="h-4 w-4" />
            {file ? file.name : 'Select a .jpbcc packet'}
            <input
              type="file"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>

          <p className="term-label mt-5 flex items-center gap-2">
            <KeyRound className="h-3 w-3 text-primary" />
            Long term channel key
          </p>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            placeholder="JP-XXXXX-XXXXX-XXXXX-XXXXX"
            className="mt-2 h-11 font-mono text-[13px] uppercase tracking-[0.12em]"
          />

          <Button
            onClick={unlock}
            disabled={busy || !file || !code.trim()}
            className="mt-4 h-9 w-full gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
            Decrypt packet
          </Button>
        </div>

        <div className="term-panel p-5">
          <p className="term-label">Vault log</p>
          <div className="mt-3 min-h-[180px] space-y-1.5 border border-border/70 bg-background/60 p-3 font-mono text-[11px]">
            {log.length === 0 ? (
              <p className="text-muted-foreground">awaiting a packet<span className="caret" /></p>
            ) : (
              log.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={line.startsWith('!') ? 'text-destructive' : 'text-primary/80'}
                >
                  {line}
                </p>
              ))
            )}
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Decryption happens in this browser only
          </p>
        </div>
      </section>
    </div>
  );
}