'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiGet, apiPatch } from '@/lib/api-client';
import Link from 'next/link';
import { AvatarSelector } from '@/components/profile/AvatarSelector';
import { StatsOverview } from '@/components/profile/StatsOverview';
import { RatingChart } from '@/components/profile/RatingChart';
import { GameHistory } from '@/components/profile/GameHistory';

interface PlayerProfile {
  userId: string;
  username: string;
  avatarId: string;
  stats: PlayerStats;
  joinedAt: string;
}

interface PlayerStats {
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  currentStreakType: string;
  bestWinStreak: number;
}

export interface RatingHistoryEntry {
  date: string;
  rating: number;
  ratingDeviation: number;
  gameResult: string;
  opponent: string;
}

type ProfileTab = 'overview' | 'history' | 'rating';

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user || !isAuthenticated()) {
      setLoading(false);
      return;
    }
    try {
      const [profileData, historyData] = await Promise.all([
        apiGet<PlayerProfile>(`/player/${user.userId}/profile`),
        apiGet<RatingHistoryEntry[]>(`/player/${user.userId}/rating-history`),
      ]);
      setProfile(profileData);
      setRatingHistory(historyData);
      setEditName(profileData.username);
    } catch {
      // Profile fetch failed
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    try {
      const updated = await apiPatch<PlayerProfile>(`/player/${user.userId}/display-name`, {
        displayName: editName.trim(),
      });
      setProfile(updated);
      setIsEditingName(false);
    } catch {
      // Name update failed
    }
  };

  const handleSelectAvatar = async (avatarId: string) => {
    if (!user) return;
    try {
      const updated = await apiPatch<PlayerProfile>(`/player/${user.userId}/avatar`, {
        avatarId,
      });
      setProfile(updated);
      setShowAvatarSelector(false);
    } catch {
      // Avatar update failed
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500" role="status" aria-label="Loading profile">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading profile...
        </div>
      </main>
    );
  }

  if (!user || !isAuthenticated()) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Not signed in</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Sign in to view your profile, stats, and game history.</p>
          <Link href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            ← Home
          </Link>
          <Link href="/play" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors text-sm">
            Play a Game
          </Link>
        </div>

        {profile && (
          <>
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <button
                  onClick={() => setShowAvatarSelector(true)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold hover:ring-4 hover:ring-blue-300 transition-all cursor-pointer flex-shrink-0"
                  aria-label="Change avatar"
                  title="Click to change avatar"
                >
                  {getAvatarEmoji(profile.avatarId)}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Editable name */}
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-xl sm:text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-gray-100 w-full max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') { setIsEditingName(false); setEditName(profile.username); }
                        }}
                        aria-label="Edit display name"
                      />
                      <button onClick={handleSaveName} className="text-green-600 hover:text-green-700 text-sm font-medium" aria-label="Save name">✓</button>
                      <button onClick={() => { setIsEditingName(false); setEditName(profile.username); }} className="text-red-600 hover:text-red-700 text-sm font-medium" aria-label="Cancel editing">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      aria-label="Edit display name"
                      title="Click to edit name"
                    >
                      {profile.username} ✏️
                    </button>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Member since {new Date(profile.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </p>
                </div>

                {/* Rating badge */}
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(profile.stats.rating)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400" title="Rating confidence interval (95%)">
                    ±{Math.round(profile.stats.ratingDeviation * 1.96)}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist" aria-label="Profile sections">
              {(['overview', 'history', 'rating'] as ProfileTab[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'overview' ? '📊 Overview' : tab === 'history' ? '📋 Game History' : '📈 Rating'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div role="tabpanel">
              {activeTab === 'overview' && <StatsOverview stats={profile.stats} />}
              {activeTab === 'history' && <GameHistory userId={user!.userId} />}
              {activeTab === 'rating' && <RatingChart data={ratingHistory} />}
            </div>

            {/* Avatar Selector Modal */}
            {showAvatarSelector && (
              <AvatarSelector
                currentAvatarId={profile.avatarId}
                onSelect={handleSelectAvatar}
                onClose={() => setShowAvatarSelector(false)}
              />
            )}
          </>
        )}

        {/* Empty state — no profile data */}
        {!profile && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎲</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No profile data yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Play your first game to start building your profile!</p>
            <Link href="/play" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
              Play Now
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

const AVATAR_MAP: Record<string, string> = {
  default: '👤',
  crown: '👑',
  star: '⭐',
  fire: '🔥',
  diamond: '💎',
  knight: '♞',
  trophy: '🏆',
  lightning: '⚡',
  heart: '❤️',
  skull: '💀',
  robot: '🤖',
  wizard: '🧙',
};

export function getAvatarEmoji(avatarId: string): string {
  return AVATAR_MAP[avatarId] ?? AVATAR_MAP.default;
}
