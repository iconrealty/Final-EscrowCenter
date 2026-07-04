import React from 'react';

export function Avatar({ name }: { name: string }) {
  const initials = name
    ? String(name).split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-white font-bold text-sm shrink-0">
      {initials}
    </div>
  );
}
