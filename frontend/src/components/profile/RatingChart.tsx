'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { RatingHistoryEntry } from '@/app/profile/page';

interface RatingChartProps {
  data: RatingHistoryEntry[];
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 300;
const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };

export const RatingChart: React.FC<RatingChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chartArea = useMemo(() => ({
    x: PADDING.left,
    y: PADDING.top,
    width: CHART_WIDTH - PADDING.left - PADDING.right,
    height: CHART_HEIGHT - PADDING.top - PADDING.bottom,
  }), []);

  const { yMin, yMax, xScale, yScale, points, confidencePath, linePath, yTicks } = useMemo(() => {
    if (data.length === 0) return { yMin: 0, yMax: 0, xScale: () => 0, yScale: () => 0, points: [], confidencePath: '', linePath: '', yTicks: [] };

    const ratings = data.map(d => d.rating);
    const margin = 50;
    const minRating = Math.floor((Math.min(...ratings) - margin) / 50) * 50;
    const maxRating = Math.ceil((Math.max(...ratings) + margin) / 50) * 50;

    const xS = (i: number) => chartArea.x + (i / Math.max(data.length - 1, 1)) * chartArea.width;
    const yS = (rating: number) => chartArea.y + chartArea.height - ((rating - minRating) / (maxRating - minRating)) * chartArea.height;

    const pts = data.map((d, i) => ({
      x: xS(i),
      y: yS(d.rating),
      data: d,
      index: i,
    }));

    // Line path
    const lPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Confidence band path
    const upperPts = data.map((d, i) => ({ x: xS(i), y: yS(d.rating + d.ratingDeviation * 1.96) }));
    const lowerPts = data.map((d, i) => ({ x: xS(i), y: yS(d.rating - d.ratingDeviation * 1.96) }));
    const cPath = [
      ...upperPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`),
      ...lowerPts.reverse().map((p, i) => `${i === 0 ? 'L' : 'L'} ${p.x} ${p.y}`),
      'Z',
    ].join(' ');

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const rating = minRating + (maxRating - minRating) * (i / tickCount);
      return { rating: Math.round(rating), y: yS(rating) };
    });

    return { yMin: minRating, yMax: maxRating, xScale: xS, yScale: yS, points: pts, confidencePath: cPath, linePath: lPath, yTicks: ticks };
  }, [data, chartArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setHoveredIndex(closest);
  }, [data.length, points]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="text-4xl mb-3">📈</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No rating data yet</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Play rated games (Medium, Hard, or Expert vs AI) to see your rating progression.
        </p>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Play more games</h3>
        <p className="text-gray-600 dark:text-gray-400">
          You need at least 2 rated games to see your rating trend. Keep playing!
        </p>
      </div>
    );
  }

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rating Progression</h3>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex flex-wrap gap-4">
          <span>📅 {new Date(hoveredPoint.data.date).toLocaleDateString()}</span>
          <span>📊 Rating: <strong className="text-gray-900 dark:text-gray-100">{Math.round(hoveredPoint.data.rating)}</strong></span>
          <span>{getResultIcon(hoveredPoint.data.gameResult)} vs {hoveredPoint.data.opponent}</span>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-auto min-w-[400px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
          role="img"
          aria-label={`Rating chart showing ${data.length} data points from ${Math.round(data[0].rating)} to ${Math.round(data[data.length - 1].rating)}`}
        >
          {/* Y-axis ticks and grid */}
          {yTicks.map((tick) => (
            <g key={tick.rating}>
              <line
                x1={chartArea.x}
                y1={tick.y}
                x2={chartArea.x + chartArea.width}
                y2={tick.y}
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
                strokeDasharray="4 4"
              />
              <text
                x={chartArea.x - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-gray-400 dark:text-gray-500 text-[11px]"
                fill="currentColor"
              >
                {tick.rating}
              </text>
            </g>
          ))}

          {/* X-axis date labels */}
          {points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 5)) === 0).map((point) => (
            <text
              key={point.index}
              x={point.x}
              y={chartArea.y + chartArea.height + 20}
              textAnchor="middle"
              className="text-gray-400 dark:text-gray-500 text-[10px]"
              fill="currentColor"
            >
              {new Date(point.data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}

          {/* Confidence band */}
          <path
            d={confidencePath}
            className="fill-blue-100 dark:fill-blue-900/30"
            opacity={0.5}
          />

          {/* Rating line */}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            className="text-blue-600 dark:text-blue-400"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point) => (
            <circle
              key={point.index}
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === point.index ? 6 : 3}
              className={hoveredIndex === point.index
                ? 'fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-gray-800'
                : getPointClass(point.data.gameResult)
              }
              strokeWidth={hoveredIndex === point.index ? 2 : 0}
            />
          ))}

          {/* Hover vertical line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={chartArea.y}
              x2={hoveredPoint.x}
              y2={chartArea.y + chartArea.height}
              stroke="currentColor"
              className="text-gray-300 dark:text-gray-600"
              strokeDasharray="4 4"
            />
          )}
        </svg>
      </div>

      {/* Accessible data table alternative */}
      <details className="mt-4">
        <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          View data table
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-sm" aria-label="Rating history data">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-1">Date</th>
                <th className="pb-1">Rating</th>
                <th className="pb-1">Result</th>
                <th className="pb-1">Opponent</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, i) => (
                <tr key={i} className="border-b last:border-0 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                  <td className="py-1">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="py-1">{Math.round(entry.rating)}</td>
                  <td className="py-1">{getResultIcon(entry.gameResult)} {entry.gameResult}</td>
                  <td className="py-1">{entry.opponent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

function getResultIcon(result: string): string {
  switch (result) {
    case 'WhiteWin':
    case 'Win': return '✅';
    case 'BlackWin':
    case 'Loss': return '❌';
    case 'Draw': return '🤝';
    default: return '•';
  }
}

function getPointClass(result: string): string {
  switch (result) {
    case 'WhiteWin':
    case 'Win': return 'fill-green-500';
    case 'BlackWin':
    case 'Loss': return 'fill-red-500';
    case 'Draw': return 'fill-yellow-500';
    default: return 'fill-blue-500';
  }
}
