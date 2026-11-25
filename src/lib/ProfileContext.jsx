import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const ProfileContext = createContext(null);

export const PENDING_HANDLE_KEY = 'jpbcc_pending_handle';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_LABELS = {
  avatar_uri: 'Avatar',
  background_uri: 'Background',
};

function baseHandleFrom(email, fullName) {
  const source = String(fullName || email || 'operator')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  const base = source.length >= 3 ? source.slice(0, 16) : `op${source}`;
  return base.length >= 3 ? base.slice(0, 20) : 'operator';
}

async function reserveHandle(preferred) {
  let candidate = preferred;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const page = await base44.entities.Profile.filter({ username: candidate }, { limit: 1, fields: ['id'] });
    if (!page.items || page.items.length === 0) return candidate;
    candidate = `${preferred.slice(0, 14)}${Math.floor(Math.random() * 900 + 100)}`;
  }
  return `${preferred.slice(0, 10)}${Date.now().toString().slice(-5)}`;
}

export function ProfileProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const signPrivateFile = useCallback(async (uri) => {
    if (!uri) return '';
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: uri,
        expires_in: 21600,
      });
      return signed_url || '';
    } catch (error) {
      return '';
    }
  }, []);

  const signAvatar = useCallback(
    async (uri) => {
      setAvatarUrl(await signPrivateFile(uri));
    },
    [signPrivateFile]
  );

  const signBackground = useCallback(
    async (uri) => {
      setBackgroundUrl(await signPrivateFile(uri));
    },
    [signPrivateFile]
  );

  const load = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const page = await base44.entities.Profile.filter({ user_id: user.id }, { limit: 1 });
      let current = page.items?.[0];

      if (!current) {
        const pending = localStorage.getItem(PENDING_HANDLE_KEY);
        const handle = await reserveHandle(pending || baseHandleFrom(user.email, user.full_name));
        current = await base44.entities.Profile.create({
          user_id: user.id,
          username: handle,
          display_name: user.full_name || handle,
          bio: '',
          joined_date: new Date().toISOString(),
        });
        localStorage.removeItem(PENDING_HANDLE_KEY);
      }

      const aliasPage = await base44.entities.LoginAlias.filter({ user_id: user.id }, { limit: 1 });
      const alias = aliasPage.items?.[0];
      if (!alias) {
        await base44.entities.LoginAlias.create({
          user_id: user.id,
          username: current.username,
          email: user.email,
        });
      } else if (alias.username !== current.username || alias.email !== user.email) {
        await base44.entities.LoginAlias.update(alias.id, { username: current.username, email: user.email });
      }

      setProfile(current);
      await signAvatar(current.avatar_uri);
      await signBackground(current.background_uri);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.full_name, signAvatar, signBackground]);

  const storeImage = useCallback(
    async (field, file) => {
      if (!profile) throw new Error('Your operator profile is still loading.');
      if (!file) throw new Error('Choose an image first.');
      const label = IMAGE_LABELS[field] || 'Image';
      if (!String(file.type || '').startsWith('image/')) {
        throw new Error(`${label}s must be an image file.`);
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error(`${label}s must be 8 MB or smaller.`);
      }

      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.Profile.update(profile.id, { [field]: file_uri });
      setProfile((prev) => (prev ? { ...prev, [field]: file_uri } : prev));

      if (field === 'avatar_uri') {
        await signAvatar(file_uri);
      } else {
        await signBackground(file_uri);
      }
      return file_uri;
    },
    [profile, signAvatar, signBackground]
  );

  const clearImage = useCallback(
    async (field) => {
      if (!profile) return;
      await base44.entities.Profile.update(profile.id, { [field]: '' });
      setProfile((prev) => (prev ? { ...prev, [field]: '' } : prev));

      if (field === 'avatar_uri') {
        await signAvatar('');
      } else {
        await signBackground('');
      }
    },
    [profile, signAvatar, signBackground]
  );

  useEffect(() => {
    if (isAuthenticated && user) {
      setLoading(true);
      load();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [isAuthenticated, user, load]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      avatarUrl,
      backgroundUrl,
      setProfile,
      reload: load,
      signPrivateFile,
      signAvatar,
      signBackground,
      storeImage,
      clearImage,
    }),
    [
      profile,
      loading,
      avatarUrl,
      backgroundUrl,
      load,
      signPrivateFile,
      signAvatar,
      signBackground,
      storeImage,
      clearImage,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}