import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RequestCard from '@/components/RequestCard';
import { acceptRequest, cancelRequest, rejectRequest } from '@/lib/connections';
import { toast } from '@/components/ui/use-toast';

export default function Requests() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [issued, setIssued] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [received, sent] = await Promise.all([
      base44.entities.Connection.filter(
        { to_user_id: user.id },
        { sort: '-created_date', limit: 40 }
      ),
      base44.entities.Connection.filter(
        { from_user_id: user.id },
        { sort: '-created_date', limit: 40 }
      ),
    ]);
    setIncoming(received.items || []);
    setOutgoing(sent.items || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (request) => {
    setBusyId(request.id);
    try {
      const result = await acceptRequest(request);
      setIssued(result);
      await load();
    } catch (error) {
      toast({ title: 'Accept failed', description: error.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request) => {
    setBusyId(request.id);
    try {
      await rejectRequest(request);
      await load();
    } catch (error) {
      toast({ title: 'Reject failed', description: error.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (request) => {
    setBusyId(request.id);
    try {
      await cancelRequest(request);
      await load();
    } catch (error) {
      toast({ title: 'Cancel failed', description: error.message });
    } finally {
      setBusyId(null);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(issued?.key_code || '');
      toast({ title: 'Key copied', description: 'Store it somewhere only you can reach.' });
    } catch (error) {
      toast({ title: 'Copy failed', description: 'Select the key and copy it manually.' });
    }
  };

  return (
    <div className="space-y-6">
      <section className="term-panel term-panel-top p-5 rise">
        <p className="term-label">Handshake queue</p>
        <h1 className="mt-2 font-display text-lg tracking-[0.14em] text-foreground glow-text">
          CHANNEL REQUESTS<span className="caret" />
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Approving a request opens the channel and issues one long term key to both operators by
          email. That key is the only way to turn sealed blocks back into readable content.
        </p>
      </section>

      {loading ? (
        <div className="term-panel flex items-center gap-2 p-5 font-mono text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading handshake queue…
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <Inbox className="h-3.5 w-3.5 text-accent" />
              <h2 className="term-label">Addressed to me</h2>
              <span className="h-px flex-1 bg-border/70" />
            </div>
            {incoming.length === 0 ? (
              <div className="term-panel p-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                No inbound requests
              </div>
            ) : (
              incoming.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  direction="incoming"
                  busy={busyId === request.id}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              <h2 className="term-label">Sent by me</h2>
              <span className="h-px flex-1 bg-border/70" />
            </div>
            {outgoing.length === 0 ? (
              <div className="term-panel p-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                You have not requested any channel yet
              </div>
            ) : (
              outgoing.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  direction="outgoing"
                  busy={busyId === request.id}
                  onCancel={handleCancel}
                />
              ))
            )}
          </section>
        </>
      )}

      <Dialog open={Boolean(issued)} onOpenChange={() => setIssued(null)}>
        <DialogContent className="border-border bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Channel key issued
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-muted-foreground">
              The same key was emailed to both operators. Every block asks for it before it decrypts,
              and files downloaded from this channel can only be opened with it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="term-label flex items-center gap-2">
                <KeyRound className="h-3 w-3" />
                Long term key
              </p>
              <p className="mt-2 break-all font-mono text-[15px] tracking-[0.14em] text-foreground">
                {issued?.key_code}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                Fingerprint {issued?.key_fingerprint}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyKey} variant="outline" className="h-9 flex-1 border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
                Copy key
              </Button>
              {issued?.conversation_id ? (
                <Link to={`/chat/${issued.conversation_id}`} className="flex-1">
                  <Button className="h-9 w-full font-mono text-[10px] uppercase tracking-[0.16em]">
                    Open terminal
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}