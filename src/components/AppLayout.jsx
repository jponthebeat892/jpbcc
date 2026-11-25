import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ProfileProvider, useProfile } from '@/lib/ProfileContext';
import TerminalChrome from '@/components/TerminalChrome';

function LayoutShell() {
  const { user } = useAuth();
  const { profile, backgroundUrl } = useProfile();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => {};
    base44.entities.Connection.count({ to_user_id: user.id, status: 'pending' })
      .then((total) => {
        if (active) setPendingCount(total || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  return (
    <TerminalChrome
      handle={profile?.username}
      backdrop={backgroundUrl}
      pendingCount={pendingCount}
      onLogout={handleLogout}
    >
      <Outlet />
    </TerminalChrome>
  );
}

export default function AppLayout() {
  return (
    <ProfileProvider>
      <LayoutShell />
    </ProfileProvider>
  );
}