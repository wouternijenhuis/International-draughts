'use client';

import React from 'react';
import { getAvatarEmoji } from '@/app/profile/page';

const AVATARS = [
  { id: 'default', label: 'Default' },
  { id: 'crown', label: 'Crown' },
  { id: 'star', label: 'Star' },
  { id: 'fire', label: 'Fire' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'knight', label: 'Knight' },
  { id: 'trophy', label: 'Trophy' },
  { id: 'lightning', label: 'Lightning' },
  { id: 'heart', label: 'Heart' },
  { id: 'skull', label: 'Skull' },
  { id: 'robot', label: 'Robot' },
  { id: 'wizard', label: 'Wizard' },
];

interface AvatarSelectorProps {
  currentAvatarId: string;
  onSelect: (avatarId: string) => void;
  onClose: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  currentAvatarId,
  onSelect,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Choose avatar"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">Choose Avatar</h2>
        <div className="grid grid-cols-4 gap-3">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              className={`w-full aspect-square rounded-xl text-3xl flex items-center justify-center transition-all hover:scale-110 ${
                currentAvatarId === avatar.id
                  ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label={avatar.label}
              aria-pressed={currentAvatarId === avatar.id}
            >
              {getAvatarEmoji(avatar.id)}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
