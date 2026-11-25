import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Terminal, Users, ShieldCheck, KeyRound, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NAV_ITEMS = [
  { label: 'TERMINAL', path: '/', icon: Terminal },
  { label: 'OPERATORS', path: '/users', icon: Users },
  { label: 'REQUESTS', path: '/requests', icon: ShieldCheck },
  { label: 'VAULT', path: '/vault', icon: KeyRound },
  { label: 'SETTINGS', path: '/settings', icon: SettingsIcon },
];

export default function TerminalNav({ pendingCount = 0 }) {
  const { pathname } = useLocation();

  return (
    <>
      <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border/70 bg-card/40 px-3 py-5 md:flex">
        <p className="term-label px-3 pb-3">Navigation</p>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center gap-3 border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary/50 hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.path === '/requests' && pendingCount > 0 ? (
                <span className="ml-auto rounded-sm bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/70 bg-card/90 backdrop-blur-md md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}