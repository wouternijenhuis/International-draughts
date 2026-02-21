import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/shared/utils/date_formatter.dart';
import '../domain/player_stats.dart';

/// Line chart displaying a player's rating history with confidence bands.
///
/// Uses `fl_chart` to render:
/// - A main line for the rating over time.
/// - A filled area (confidence band) for rating ± deviation.
/// - Touch tooltips showing date and rating.
/// - Responsive sizing via [LayoutBuilder].
class RatingChart extends StatelessWidget {
  /// Creates a [RatingChart].
  const RatingChart({
    required this.entries, super.key,
  });

  /// The rating history entries to plot.
  final List<RatingHistoryEntry> entries;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return _buildEmptyState(context);
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final lineColor = theme.colorScheme.primary;
    final bandColor = lineColor.withValues(alpha: 0.15);
    final gridColor = isDark
        ? Colors.white.withValues(alpha: 0.1)
        : Colors.black.withValues(alpha: 0.1);

    // Build spot data.
    final spots = <FlSpot>[];
    final upperBand = <FlSpot>[];
    final lowerBand = <FlSpot>[];

    for (var i = 0; i < entries.length; i++) {
      final entry = entries[i];
      spots.add(FlSpot(i.toDouble(), entry.rating));
      upperBand.add(FlSpot(i.toDouble(), entry.rating + entry.deviation));
      lowerBand.add(FlSpot(i.toDouble(), entry.rating - entry.deviation));
    }

    // Compute Y axis bounds with padding.
    final allValues = [
      ...spots.map((s) => s.y),
      ...upperBand.map((s) => s.y),
      ...lowerBand.map((s) => s.y),
    ];
    final minY = (allValues.reduce((a, b) => a < b ? a : b) - 50)
        .floorToDouble();
    final maxY = (allValues.reduce((a, b) => a > b ? a : b) + 50)
        .ceilToDouble();

    return LayoutBuilder(
      builder: (context, constraints) {
        return SizedBox(
          height: 200,
          width: constraints.maxWidth,
          child: LineChart(
            LineChartData(
              minX: 0,
              maxX: (entries.length - 1).toDouble().clamp(1, double.infinity),
              minY: minY,
              maxY: maxY,
              gridData: FlGridData(
                drawVerticalLine: false,
                horizontalInterval: _computeInterval(maxY - minY),
                getDrawingHorizontalLine: (value) => FlLine(
                  color: gridColor,
                  strokeWidth: 0.5,
                ),
              ),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(
                  
                ),
                rightTitles: const AxisTitles(
                  
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    interval: _bottomInterval(entries.length),
                    getTitlesWidget: (value, meta) {
                      final idx = value.toInt();
                      if (idx < 0 || idx >= entries.length) {
                        return const SizedBox.shrink();
                      }
                      return Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          DateFormatter.shortDate(entries[idx].date),
                          style: TextStyle(
                            fontSize: 10,
                            color: isDark ? Colors.white54 : Colors.black54,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 40,
                    interval: _computeInterval(maxY - minY),
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toInt().toString(),
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? Colors.white54 : Colors.black54,
                        ),
                      );
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: false),
              lineTouchData: LineTouchData(
                touchTooltipData: LineTouchTooltipData(
                  getTooltipItems: (touchedSpots) {
                    return touchedSpots.map((spot) {
                      final idx = spot.spotIndex;
                      if (idx < 0 || idx >= entries.length) return null;
                      final entry = entries[idx];
                      return LineTooltipItem(
                        '${DateFormatter.shortDate(entry.date)}\n'
                        'Rating: ${entry.rating.toInt()}'
                        '${entry.deviation > 0 ? ' ±${entry.deviation.toInt()}' : ''}',
                        const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      );
                    }).toList();
                  },
                ),
              ),
              lineBarsData: [
                // Confidence band upper line (invisible).
                LineChartBarData(
                  spots: upperBand,
                  isCurved: true,
                  curveSmoothness: 0.2,
                  color: Colors.transparent,
                  barWidth: 0,
                  dotData: const FlDotData(show: false),
                ),
                // Confidence band lower line (invisible).
                LineChartBarData(
                  spots: lowerBand,
                  isCurved: true,
                  curveSmoothness: 0.2,
                  color: Colors.transparent,
                  barWidth: 0,
                  dotData: const FlDotData(show: false),
                ),
                // Main rating line.
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  curveSmoothness: 0.2,
                  color: lineColor,
                  barWidth: 2.5,
                  isStrokeCapRound: true,
                  dotData: FlDotData(
                    show: entries.length <= 20,
                    getDotPainter: (spot, percent, bar, index) =>
                        FlDotCirclePainter(
                      radius: 3,
                      color: lineColor,
                      strokeWidth: 1,
                      strokeColor: Colors.white,
                    ),
                  ),
                  belowBarData: BarAreaData(),
                ),
              ],
              betweenBarsData: [
                BetweenBarsData(
                  fromIndex: 0,
                  toIndex: 1,
                  color: bandColor,
                ),
              ],
            ),
            duration: DesignTokens.animationDuration,
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return SizedBox(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.show_chart,
              size: 48,
              color: Theme.of(context).colorScheme.onSurface.withValues(
                    alpha: 0.3,
                  ),
            ),
            const SizedBox(height: DesignTokens.spacingSm),
            Text(
              'No rating history yet',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5),
                  ),
            ),
            const SizedBox(height: DesignTokens.spacingXs),
            Text(
              'Play games to build your rating history.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.4),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  double _computeInterval(double range) {
    if (range <= 100) return 25;
    if (range <= 300) return 50;
    if (range <= 600) return 100;
    return 200;
  }

  double _bottomInterval(int count) {
    if (count <= 5) return 1;
    if (count <= 10) return 2;
    if (count <= 20) return 5;
    return (count / 5).roundToDouble();
  }
}
