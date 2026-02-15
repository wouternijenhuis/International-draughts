'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import Link from 'next/link';

interface GameHistoryItem {
  id: string;
  date: string;
  opponent: string;
  result: string;
  moveCount: number;
  timeControl: string | null;
  gameMode: string;
  difficulty: string | null;
}

interface GameHistoryResponse {
  items: GameHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface GameHistoryProps {
  userId: string;
}

type FilterResult = 'all' | 'WhiteWin' | 'BlackWin' | 'Draw';
type FilterDifficulty = 'all' | 'easy' | 'medium' | 'hard' | 'expert';
type FilterMode = 'all' | 'HumanVsAI' | 'HumanVsHuman';

export const GameHistory: React.FC<GameHistoryProps> = ({ userId }) => {
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState<FilterResult>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const pageSize = 20;

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filterResult !== 'all') params.set('result', filterResult);
      if (filterDifficulty !== 'all') params.set('difficulty', filterDifficulty);
      if (filterMode !== 'all') params.set('mode', filterMode);

      const response = await apiGet<GameHistoryResponse>(`/player/${userId}/games?${params}`);
      if (page === 1) {
        setGames(response.items);
      } else {
        setGames(prev => [...prev, ...response.items]);
      }
      setTotalCount(response.totalCount);
    } catch {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  }, [userId, page, filterResult, filterDifficulty, filterMode]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setGames([]);
  }, [filterResult, filterDifficulty, filterMode]);

  if (!loading && games.length === 0 && page === 1) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {filterResult !== 'all' || filterDifficulty !== 'all' || filterMode !== 'all'
            ? 'No games match your filters'
            : 'No games played yet'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {filterResult !== 'all' || filterDifficulty !== 'all' || filterMode !== 'all'
            ? 'Try different filter settings.'
            : 'Play your first game to start building your history!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Result"
            value={filterResult}
            onChange={(v) => setFilterResult(v as FilterResult)}
            options={[
              { value: 'all', label: 'All Results' },
              { value: 'WhiteWin', label: 'Wins' },
              { value: 'BlackWin', label: 'Losses' },
              { value: 'Draw', label: 'Draws' },
            ]}
          />
          <FilterSelect
            label="Difficulty"
            value={filterDifficulty}
            onChange={(v) => setFilterDifficulty(v as FilterDifficulty)}
            options={[
              { value: 'all', label: 'All Difficulties' },
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
              { value: 'expert', label: 'Expert' },
            ]}
          />
          <FilterSelect
            label="Mode"
            value={filterMode}
            onChange={(v) => setFilterMode(v as FilterMode)}
            options={[
              { value: 'all', label: 'All Modes' },
              { value: 'HumanVsAI', label: 'vs AI' },
              { value: 'HumanVsHuman', label: 'Local PvP' },
            ]}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {totalCount} game{totalCount !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Game list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/replay/${game.id}`}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="text-xl flex-shrink-0">{getResultEmoji(game.result)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {game.opponent}
                  </span>
                  {game.difficulty && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyBadge(game.difficulty)}`}>
                      {game.difficulty}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {new Date(game.date).toLocaleDateString()} · {game.moveCount} moves
                  {game.timeControl ? ` · ${game.timeControl}` : ''}
                </div>
              </div>
              <div className="text-gray-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Load more */}
      {games.length < totalCount && (
        <div className="text-center">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load More (${games.length}/${totalCount})`}
          </button>
        </div>
      )}

      {loading && page === 1 && (
        <div className="text-center py-8 text-gray-500" role="status">Loading games...</div>
      )}
    </div>
  );
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={label}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function getResultEmoji(result: string): string {
  switch (result) {
    case 'WhiteWin': return '✅';
    case 'BlackWin': return '❌';
    case 'Draw': return '🤝';
    default: return '•';
  }
}

function getDifficultyBadge(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'hard': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
    case 'expert': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}
