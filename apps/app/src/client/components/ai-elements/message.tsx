'use client';

import { type ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/client/components/ui/avatar";

interface MessageProps {
  children: ReactNode;
  from: 'user' | 'assistant';
}

export const Message = ({ children, from }: MessageProps) => {
  return (
    <div className={`flex gap-4 ${from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      {children}
    </div>
  );
};

interface MessageContentProps {
  children: ReactNode;
}

export const MessageContent = ({ children }: MessageContentProps) => {
  return (
    <div className="flex-1 space-y-2">
      {children}
    </div>
  );
};

interface MessageAvatarProps {
  src?: string;
  name: string;
}

export const MessageAvatar = ({ src, name }: MessageAvatarProps) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={src} alt={name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};
