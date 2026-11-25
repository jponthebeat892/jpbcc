import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import Backdrop from '@/components/Backdrop';
import ProfileAvatar from '@/components/ProfileAvatar';
import TerminalNav from '@/components/TerminalNav';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/lib/ProfileContext';

export default function TerminalChrome({ handle, backdrop, pendingCount = 0, status = 'SECURE CHANNEL ACTIVE', children, onLogout }) {
  const { profile } = useProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <Backdrop url={backdrop} />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center border border-primary/50 bg-primary/10 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div className="leading-none">
              <p className="font-display text-[13px] font-semibold tracking-[0.3em] text-foreground">JPBCC</p>
              <p className="term-label mt-1">Secure comm channel</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary blink" />
              {status}
            </span>
            <Link
              to="/profile"
              className="flex items-center gap-2 border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-border"
            >
              <ProfileAvatar
                uri={profile?.avatar_uri}
                handle={handle}
                className="h-7 w-7 rounded-full text-[10px]"
              />
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                {handle ? `@${handle}` : 'anonymous'}
              </span>
            </Link>
            {onLogout ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="h-8 gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-3 w-3" />
                Exit
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <TerminalNav pendingCount={pendingCount} />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">{children}</main>
      </div>
    </div>
  );
}