import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, MessageSquarePlus, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/ProfileAvatar';

export default function OperatorCard({ operator, state = 'none', channelId, busy = false, onRequest }) {
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState('');

  return (
    <div className="term-panel p-4 rise">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          uri={operator.avatar_uri}
          handle={operator.username}
          className="h-9 w-9 shrink-0 rounded-full text-[12px]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] text-foreground">@{operator.username}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {operator.display_name || 'Operator'}
          </p>
          {operator.bio ? (
            <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground/80">{operator.bio}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {state === 'channel' && channelId ? (
          <Link to={`/chat/${channelId}`}>
            <Button className="h-8 w-full gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]">
              <Radio className="h-3 w-3" />
              Open channel
            </Button>
          </Link>
        ) : state === 'pending' ? (
          <Button
            disabled
            variant="outline"
            className="h-8 w-full gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            <Loader2 className="h-3 w-3" />
            Awaiting approval
          </Button>
        ) : open ? (
          <div className="space-y-2">
            <textarea
              value={intro}
              onChange={(event) => setIntro(event.target.value.slice(0, 240))}
              rows={2}
              placeholder="Why do you need this channel?"
              className="w-full resize-none border border-input bg-background/60 px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => onRequest(operator, intro.trim())}
                disabled={busy}
                className="h-8 flex-1 gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                Send request
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-8 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="h-8 w-full gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <MessageSquarePlus className="h-3 w-3" />
            Request channel
          </Button>
        )}
      </div>
    </div>
  );
}