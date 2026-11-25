import React from 'react';

export default function StatTile({ label, value, tone = 'text-foreground' }) {
  return (
    <div className="border border-border/70 bg-background/50 px-3 py-2.5">
      <p className="term-label">{label}</p>
      <p className={`mt-1 font-display text-base tracking-[0.12em] ${tone}`}>{value}</p>
    </div>
  );
}