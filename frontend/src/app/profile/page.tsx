'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface PlayerProfile {
  userId: string;
  username: string;
  stats: {
    rating: number;
    ratingDeviation: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  };
  joinedAt: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !isAuthenticated()) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiClient.get<PlayerProfile>(`/api/player/${user.userId}/profile`);
        setProfile(data);
      } catch {
        // Profile fetch failed
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, isAuthenticated]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500" role="status">Loading profile...</div>
      </main>
    );
  }

  if (!user || !isAuthenticated()) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Not signed in</h1>
          <Link href="/login" className="text-blue-600 hover:underline">Sign in to view your profile</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {profile?.username ?? user.username}
        </h1>

        {profile && (
          <div className="space-y-6">
            {/* Rating Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rating</h2>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {Math.round(profile.stats.rating)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ±{Math.round(profile.stats.ratingDeviation * 2)} confidence interval
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Statistics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatItem label="Games" value={profile.stats.gamesPlayed} />
                <StatItem label="Wins" value={profile.stats.wins} color="text-green-600" />
                <StatItem label="Losses" value={profile.stats.losses} color="text-red-600" />
                <StatItem label="Draws" value={profile.stats.draws} color="text-yellow-600" />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {profile.stats.winRate}%
                  </span>
                </div>
                {/* Win rate bar */}
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(profile.stats.winRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Member since */}
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Member since {new Date(profile.joinedAt).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/play" className="text-blue-600 hover:underline">← Back to game</Link>
        </div>
      </div>
    </main>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color ?? 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}
