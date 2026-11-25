import React from 'react';

export default function Backdrop({ url }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {url ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,hsl(var(--term-green)/0.22),transparent_42%),radial-gradient(circle_at_88%_82%,hsl(var(--term-amber)/0.16),transparent_45%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/92 to-background" />
      {url ? <div className="absolute inset-0 scanlines opacity-30" /> : null}
      <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:44px_44px]" />
    </div>
  );
}