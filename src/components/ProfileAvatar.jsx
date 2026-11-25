import React, { useEffect, useState } from 'react';
import { useProfile } from '@/lib/ProfileContext';
import { initialsOf } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function ProfileAvatar({ uri, handle, className }) {
  const { signPrivateFile } = useProfile();
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    if (!uri) {
      setUrl('');
      return () => {
        active = false;
      };
    }
    signPrivateFile(uri).then((value) => {
      if (active) setUrl(value);
    });
    return () => {
      active = false;
    };
  }, [uri, signPrivateFile]);

  if (url) {
    return (
      <img
        src={url}
        alt={handle ? `${handle} avatar` : 'operator avatar'}
        className={cn('border border-primary/30 object-cover', className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'grid place-items-center border border-primary/30 bg-primary/10 font-mono text-primary',
        className
      )}
    >
      {initialsOf(handle)}
    </span>
  );
}