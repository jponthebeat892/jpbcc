import React, { useEffect, useState } from 'react';
import { Loader2, LogOut, Save, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProfileImagePicker from '@/components/ProfileImagePicker';
import { usernameErrorMessage } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { profile, reload } = useProfile();
  const [form, setForm] = useState({ username: '', display_name: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username || '',
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!profile) return;
    const next = form.username.trim().toLowerCase();
    const problem = usernameErrorMessage(next);
    if (problem) {
      toast({ title: 'Handle rejected', description: problem });
      return;
    }

    setSaving(true);
    try {
      if (next !== profile.username) {
        const taken = await base44.entities.Profile.filter(
          { username: next },
          { limit: 2, fields: ['user_id'] }
        );
        const clash = (taken.items || []).some((entry) => entry.user_id !== user.id);
        if (clash) throw new Error('That handle is already taken by another operator.');
      }

      await base44.entities.Profile.update(profile.id, {
        username: next,
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
      });

      const aliasPage = await base44.entities.LoginAlias.filter({ user_id: user.id }, { limit: 1 });
      const alias = aliasPage.items?.[0];
      if (alias) {
        await base44.entities.LoginAlias.update(alias.id, { username: next, email: user.email });
      } else {
        await base44.entities.LoginAlias.create({ user_id: user.id, username: next, email: user.email });
      }

      await reload();
      toast({ title: 'Identity updated', description: `You now sign in as @${next}.` });
    } catch (error) {
      toast({ title: 'Update failed', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="term-panel term-panel-top p-5 rise">
        <p className="term-label">Operator settings</p>
        <h1 className="mt-2 font-display text-lg tracking-[0.14em] text-foreground glow-text">
          TERMINAL SETTINGS<span className="caret" />
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your handle is how other operators find you and how you sign in. Your avatar and background
          images are uploaded as private files and served back through short-lived links (stored
          privately).
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="term-panel p-5">
          <p className="term-label">Identity</p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Handle
              </Label>
              <Input
                id="username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value.toLowerCase() }))}
                className="h-10 font-mono text-[13px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Display name
              </Label>
              <Input
                id="display"
                value={form.display_name}
                onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Short line
              </Label>
              <Input
                id="bio"
                value={form.bio}
                onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value.slice(0, 160) }))}
                className="h-10"
              />
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="h-9 gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save identity
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <ProfileImagePicker
            field="avatar_uri"
            label="Operator avatar"
            hint="Shown on your profile page, in the terminal header and beside your handle in the directory."
            shape="circle"
          />
          <ProfileImagePicker
            field="background_uri"
            label="Terminal background"
            hint="Painted behind every screen of your terminal."
          />

          <div className="term-panel p-5">
            <p className="term-label flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Transport
            </p>
            <dl className="mt-3 space-y-2 font-mono text-[11px]">
              {[
                ['account', user?.email || '—'],
                ['cipher', 'AES-256-GCM'],
                ['key derivation', 'PBKDF2 · 120K iterations'],
                ['attachments', 'private storage, encrypted before upload'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate text-right text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              onClick={() => base44.auth.logout('/login')}
              className="mt-4 h-9 gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}