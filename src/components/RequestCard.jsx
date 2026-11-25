import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RequestCard({ request, direction = 'incoming', busy = false, onAccept, onReject, onCancel }) {
  const navigate = useNavigate();
  const handle = direction === 'incoming' ? request.from_username : request.to_username;

  return (
    <div className="term-panel flex flex-wrap items-center gap-3 p-4 rise">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[12px] text-foreground">@{handle || 'unknown'}</p>
          <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {request.status}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {request.intro || 'No message attached to this handshake.'}
        </p>
      </div>

      {direction === 'incoming' && request.status === 'pending' ? (
        <div className="flex gap-2">
          <Button
            onClick={() => onAccept(request)}
            disabled={busy}
            className="h-8 gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Accept
          </Button>
          <Button
            variant="outline"
            onClick={() => onReject(request)}
            disabled={busy}
            className="h-8 gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Reject
          </Button>
        </div>
      ) : null}

      {direction === 'outgoing' ? (
        <div className="flex gap-2">
          {request.status === 'accepted' && request.conversation_id ? (
            <Button
              onClick={() => navigate(`/chat/${request.conversation_id}`)}
              className="h-8 font-mono text-[10px] uppercase tracking-[0.16em]"
            >
              Open terminal
            </Button>
          ) : null}
          {request.status === 'pending' ? (
            <Button
              variant="outline"
              onClick={() => onCancel(request)}
              className="h-8 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}