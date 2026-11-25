import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import OperatorCard from '@/components/OperatorCard';
import { toast } from '@/components/ui/use-toast';

export default function Users() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [operators, setOperators] = useState([]);
  const [channelByUser, setChannelByUser] = useState({});
  const [pendingByUser, setPendingByUser] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    async (term) => {
      if (!user?.id) return;
      setLoading(true);
      const query = term
        ? {
            $or: [
              { username: { $regex: term, $options: 'i' } },
              { display_name: { $regex: term, $options: 'i' } },
            ],
          }
        : {};

      try {
        const [directory, channelPage, requestPage] = await Promise.all([
          base44.entities.Profile.filter(query, { sort: 'username', limit: 60 }),
          base44.entities.Conversation.filter(
            { participants: { $in: [user.id] } },
            { limit: 100, fields: ['id', 'participants'] }
          ),
          base44.entities.Connection.filter(
            { $or: [{ from_user_id: user.id }, { to_user_id: user.id }], status: 'pending' },
            { limit: 100, fields: ['from_user_id', 'to_user_id', 'status'] }
          ),
        ]);

        const channels = {};
        (channelPage.items || []).forEach((conversation) => {
          const other = (conversation.participants || []).find((participant) => participant !== user.id);
          if (other) channels[other] = conversation.id;
        });

        const pendings = {};
        (requestPage.items || []).forEach((request) => {
          const other = request.from_user_id === user.id ? request.to_user_id : request.from_user_id;
          if (other) pendings[other] = true;
        });

        setOperators((directory.items || []).filter((entry) => entry.user_id !== user.id));
        setChannelByUser(channels);
        setPendingByUser(pendings);
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  const handleRequest = async (operator, intro) => {
    setBusyId(operator.user_id);
    try {
      await base44.entities.Connection.create({
        from_user_id: user.id,
        from_username: profile?.username || 'operator',
        to_user_id: operator.user_id,
        to_username: operator.username,
        intro: intro || `@${profile?.username || 'an operator'} is requesting a secure channel.`,
        status: 'pending',
      });
      toast({
        title: 'Handshake sent',
        description: `@${operator.username} must approve before a channel key is issued.`,
      });
      await load(search.trim());
    } catch (error) {
      toast({ title: 'Request failed', description: error.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="term-panel term-panel-top p-5 rise">
        <p className="term-label">Registered operators</p>
        <h1 className="mt-2 font-display text-lg tracking-[0.14em] text-foreground glow-text">
          OPERATOR DIRECTORY<span className="caret" />
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Request a channel with any operator. They approve or reject it, and only after approval does
          the system issue the long term key that makes your blocks readable.
        </p>

        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search handle or name"
            className="h-10 w-full border border-input bg-background/60 pl-9 pr-3 font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </section>

      {loading ? (
        <div className="term-panel flex items-center gap-2 p-5 font-mono text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Scanning registry…
        </div>
      ) : operators.length === 0 ? (
        <div className="term-panel p-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          No operators matched
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {operators.map((operator) => (
            <OperatorCard
              key={operator.id}
              operator={operator}
              state={channelByUser[operator.user_id] ? 'channel' : pendingByUser[operator.user_id] ? 'pending' : 'none'}
              channelId={channelByUser[operator.user_id]}
              busy={busyId === operator.user_id}
              onRequest={handleRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}