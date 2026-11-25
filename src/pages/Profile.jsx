import React from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProfileImagePicker from '@/components/ProfileImagePicker';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { user } = useAuth();
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="term-panel flex items-center gap-2 p-5 font-mono text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary blink" />
        Reading operator file…
      </div>
    );
  }

  const joined = profile?.joined_date
    ? moment(profile.joined_date).format('DD MMM YYYY').toUpperCase()
    : '—';

  return (
    <div className="space-y-5">
      <section className="term-panel term-panel-top p-5 rise">
        <p className="term-label">Operator file</p>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <ProfileAvatar
            uri={profile?.avatar_uri}
            handle={profile?.username}
            className="h-24 w-24 rounded-full text-lg"
          />
          <div className="min-w-0">
            <h1 className="font-display text-lg tracking-[0.14em] text-foreground glow-text">
              {(profile?.display_name || 'Operator').toUpperCase()}
            </h1>
            <p className="mt-1 font-mono text-[12px] text-primary">@{profile?.username || '…'}</p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {profile?.bio || 'No short line set yet.'}
            </p>
          </div>
          <Link to="/settings" className="ml-auto">
            <Button
              variant="outline"
              className="h-9 gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <SettingsIcon className="h-3 w-3" />
              Edit identity
            </Button>
          </Link>
        </div>

        <dl className="mt-5 grid gap-3 font-mono text-[11px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['handle', `@${profile?.username || '…'}`],
            ['account', user?.email || '—'],
            ['registered', joined],
            ['cipher', 'AES-256-GCM'],
          ].map(([label, value]) => (
            <div key={label} className="border border-border/70 bg-secondary/30 px-3 py-2">
              <dt className="term-label">{label}</dt>
              <dd className="mt-1 truncate text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
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
      </section>
    </div>
  );
}