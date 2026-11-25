import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Lock } from 'lucide-react';
import { formatClock, initialsOf, kindLabel } from '@/lib/format';

export default function ChannelRow({ channel, counterparty, counterpartyHandle, unread = 0 }) {
  const handle = counterpartyHandle || counterparty || 'unknown';

  return (
    <Link
      to={`/chat/${channel.id}`}
      className="term-panel group flex items-center gap-4 p-4 transition-colors hover:border-primary/40 hover:bg-card"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-primary/30 bg-primary/10 font-mono text-[12px] text-primary">
        {initialsOf(handle)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[12px] text-foreground">@{handle}</p>
          {unread > 0 ? (
            <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] text-primary">
              {unread} NEW
            </span>
          ) : null}
        </div>
        <p className="cipher mt-1 truncate">
          {channel.last_preview || 'channel opened — no blocks yet'}
        </p>
        <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5" />
          {kindLabel('text')} · {channel.message_count || 0} BLOCKS SEALED
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatClock(channel.last_message_at || channel.created_date)}
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
          OPEN <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}