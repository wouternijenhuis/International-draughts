'use client';

import React from 'react';

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

interface StatsOverviewProps {
  stats: PlayerStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Overall Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard label="Games" value={stats.gamesPlayed} />
          <StatCard label="Wins" value={stats.wins} color="text-green-600 dark:text-green-400" />
          <StatCard label="Losses" value={stats.losses} color="text-red-600 dark:text-red-400" />
          <StatCard label="Draws" value={stats.draws} color="text-yellow-600 dark:text-yellow-400" />
        </div>
        {/* Win rate bar */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.winRate.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {stats.gamesPlayed > 0 && (
              <>
                <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${(stats.wins / stats.gamesPlayed) * 100}%` }} title={`Wins: ${stats.wins}`} />
                <div className="bg-yellow-500 h-full transition-all duration-700" style={{ width: `${(stats.draws / stats.gamesPlayed) * 100}%` }} title={`Draws: ${stats.draws}`} />
                <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${(stats.losses / stats.gamesPlayed) * 100}%` }} title={`Losses: ${stats.losses}`} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Streaks</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Streak</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.currentStreak > 0 ? (
                <>
                  {stats.currentStreak} {getStreakIcon(stats.currentStreakType)}
                </>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
            {stats.currentStreak > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                {stats.currentStreakType} streak
              </div>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Best Win Streak</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.bestWinStreak > 0 ? (
                <>{stats.bestWinStreak} 🔥</>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note about PvC only */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center italic">
        Statistics track Player vs Computer games only. Local PvP games are not included.
      </p>
    </div>
  );
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className={`text-2xl font-bold ${color ?? 'text-gray-900 dark:text-gray-100'}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function getStreakIcon(type: string): string {
  switch (type) {
    case 'win': return '🏆';
    case 'loss': return '💔';
    case 'draw': return '🤝';
    default: return '';
  }
}
