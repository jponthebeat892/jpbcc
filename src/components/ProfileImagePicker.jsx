import React, { useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { useProfile } from '@/lib/ProfileContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function ProfileImagePicker({ field, label, hint, shape = 'panel' }) {
  const { profile, avatarUrl, backgroundUrl, storeImage, clearImage } = useProfile();
  const [busy, setBusy] = useState(false);

  const previewUrl = field === 'avatar_uri' ? avatarUrl : backgroundUrl;
  const circle = shape === 'circle';

  const run = async (task) => {
    setBusy(true);
    try {
      await task();
      toast({ title: `${label} updated`, description: 'Your profile now shows the change.' });
    } catch (error) {
      toast({ title: `${label} not updated`, description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) run(() => storeImage(field, file));
  };

  return (
    <div className="term-panel p-5">
      <p className="term-label">{label}</p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}

      <div
        className={cn(
          'mt-3 border border-border/70 bg-secondary/40 bg-cover bg-center',
          circle ? 'h-20 w-20 rounded-full' : 'h-32 w-full'
        )}
        style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
      >
        {previewUrl ? null : (
          <span className="grid h-full w-full place-items-center font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {circle ? 'none' : 'no image'}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 border border-border px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Upload image
          <input type="file" accept="image/*" className="hidden" onChange={choose} />
        </label>
        {profile?.[field] ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(() => clearImage(field))}
            className="h-9 gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}