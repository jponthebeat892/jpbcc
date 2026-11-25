import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Loader2, Radio, ShieldCheck, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { Button } from '@/components/ui/button';
import StatTile from '@/components/StatTile';
import ChannelRow from '@/components/ChannelRow';
import RequestCard from '@/components/RequestCard';
import { acceptRequest, counterpartOf, rejectRequest } from '@/lib/connections';
import { toast } from '@/components/ui/use-toast';

const EMPTY = { channels: [], requests: [], unread: {}, loading: true };

export default function Home() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [state, setState] = useState(EMPTY);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [channelPage, requestPage] = await Promise.all([
      base44.entities.Conversation.filter(
        { participants: { $in: [user.id] } },
        { sort: '-last_message_at', limit: 50 }
      ),
      base44.entities.Connection.filter(
        { to_user_id: user.id, status: 'pending' },
        { sort: '-created_date', limit: 10 }
      ),
    ]);

    let unread = {};
    try {
      const result = await base44.entities.Message.aggregate({
        query: { participants: { $in: [user.id] }, read_by: { $ne: user.id } },
        groupBy: 'conversation_id',
      });
      (result.rows || []).forEach((row) => {
        unread[row.conversation_id] = row.count;
      });
    } catch (error) {
      unread = {};
    }

    setState({
      channels: channelPage.items || [],
      requests: requestPage.items || [],
      unread,
      loading: false,
    });
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (request) => {
    setBusyId(request.id);
    try {
      const issued = await acceptRequest(request);
      toast({
        title: 'Channel opened',
        description: `The long term key was emailed to @${profile?.username || 'you'} and @${request.from_username}.`,
      });
      await load();
      if (issued.conversation_id) window.location.assign(`/chat/${issued.conversation_id}`);
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

  const blocks = state.channels.reduce((total, channel) => total + (channel.message_count || 0), 0);
  const unreadTotal = Object.values(state.unread).reduce((total, count) => total + count, 0);

  return (
    <div className="space-y-6">
      <section className="term-panel term-panel-top p-5 rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="term-label">Session 01 // encrypted transport</p>
            <h1 className="mt-2 font-display text-lg tracking-[0.14em] text-foreground glow-text">
              SECURE CHANNELS<span className="caret" />
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every block below is stored as ciphertext. Press VIEW and enter your channel key to
              decrypt a single block — pictures, video and audio self-destruct once you have seen them.
            </p>
          </div>
          <Link to="/users">
            <Button className="h-9 gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
              <UserPlus className="h-3.5 w-3.5" />
              Request channel
            </Button>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Channels" value={String(state.channels.length).padStart(2, '0')} tone="text-primary" />
          <StatTile label="Sealed blocks" value={String(blocks).padStart(2, '0')} />
          <StatTile label="Unread" value={String(unreadTotal).padStart(2, '0')} tone={unreadTotal ? 'text-accent' : 'text-foreground'} />
          <StatTile label="Self-destruct" value="ON" tone="text-primary" />
        </div>
      </section>

      {state.requests.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <h2 className="term-label">Inbound handshake requests</h2>
            <span className="h-px flex-1 bg-border/70" />
          </div>
          {state.requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              direction="incoming"
              busy={busyId === request.id}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <h2 className="term-label">Active channels</h2>
            <span className="h-px flex-1 bg-border/70" />
          </div>

          {state.loading ? (
            <div className="term-panel flex items-center gap-2 p-5 font-mono text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reading encrypted index…
            </div>
          ) : state.channels.length === 0 ? (
            <div className="term-panel p-6 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                No channels open
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Find an operator in the directory and request a channel. Once they approve, the system
                issues a long term key to both of you by email.
              </p>
              <Link to="/users">
                <Button className="mt-4 h-9 gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                  <UserPlus className="h-3.5 w-3.5" />
                  Open directory
                </Button>
              </Link>
            </div>
          ) : (
            state.channels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                counterparty={counterpartOf(channel, user.id).id}
                counterpartyHandle={counterpartOf(channel, user.id).handle}
                unread={state.unread[channel.id] || 0}
              />
            ))
          )}
        </div>

        <aside className="space-y-4">
          <div className="term-panel term-panel-top p-4">
            <p className="term-label">Local identity</p>
            <dl className="mt-3 space-y-2 font-mono text-[11px]">
              {[
                ['handle', `@${profile?.username || '…'}`],
                ['account', user?.email || '—'],
                ['cipher', 'AES-256-GCM'],
                ['key derivation', 'PBKDF2 · 120K'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="term-panel p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <p className="term-label">Self-destruct policy</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Pictures, video and audio are wiped from your terminal 60 seconds after they are
              decrypted. Documents leave the terminal once downloaded and can only be opened again
              through the vault with the channel key.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}