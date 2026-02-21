import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:international_draughts/core/di/providers.dart';
import 'package:international_draughts/core/errors/result.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/shared/utils/date_formatter.dart';
import '../domain/player_stats.dart';

/// Paginated game history list with filtering.
///
/// Uses infinite scrolling via a [ScrollController] to fetch more
/// pages as the user scrolls down. Supports filtering by result,
/// difficulty, and mode via filter chips.
class GameHistory extends ConsumerStatefulWidget {
  /// Creates a [GameHistory].
  const GameHistory({
    required this.userId, super.key,
  });

  /// The user ID to fetch game history for.
  final String userId;

  @override
  ConsumerState<GameHistory> createState() => _GameHistoryState();
}

class _GameHistoryState extends ConsumerState<GameHistory> {
  final ScrollController _scrollController = ScrollController();
  final List<GameHistoryEntry> _games = [];
  bool _isLoading = false;
  bool _hasMore = true;
  int _page = 1;
  static const int _pageSize = 20;

  // Filters
  String? _resultFilter;
  String? _difficultyFilter;
  String? _modeFilter;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadPage();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoading &&
        _hasMore) {
      _loadPage();
    }
  }

  Future<void> _loadPage() async {
    if (_isLoading) return;

    setState(() => _isLoading = true);

    final repo = ref.read(profileRepositoryProvider);
    final result = await repo.getGameHistory(
      widget.userId,
      page: _page,
      result: _resultFilter,
      difficulty: _difficultyFilter,
      mode: _modeFilter,
    );

    if (!mounted) return;

    setState(() {
      _isLoading = false;
      switch (result) {
        case Success(:final value):
          _games.addAll(value.games);
          _hasMore = value.hasMore;
          _page++;
        case Failure():
          _hasMore = false;
      }
    });
  }

  void _resetAndReload() {
    setState(() {
      _games.clear();
      _page = 1;
      _hasMore = true;
    });
    _loadPage();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Filter chips
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.spacingMd,
          ),
          child: Wrap(
            spacing: DesignTokens.spacingSm,
            runSpacing: DesignTokens.spacingXs,
            children: [
              // Result filter
              ..._buildResultChips(theme),
              // Difficulty filter
              ..._buildDifficultyChips(theme),
            ],
          ),
        ),
        const SizedBox(height: DesignTokens.spacingSm),

        // Game list
        Expanded(
          child: _games.isEmpty && !_isLoading
              ? _buildEmptyState(context)
              : ListView.builder(
                  controller: _scrollController,
                  itemCount: _games.length + (_hasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index >= _games.length) {
                      return const Padding(
                        padding: EdgeInsets.all(DesignTokens.spacingMd),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    return _buildGameRow(context, _games[index]);
                  },
                ),
        ),
      ],
    );
  }

  List<Widget> _buildResultChips(ThemeData theme) {
    const results = ['Won', 'Lost', 'Draw'];
    return results.map((r) {
      final filterValue = r.toLowerCase();
      final isSelected = _resultFilter == filterValue;
      return FilterChip(
        label: Text(r),
        selected: isSelected,
        onSelected: (selected) {
          _resultFilter = selected ? filterValue : null;
          _resetAndReload();
        },
      );
    }).toList();
  }

  List<Widget> _buildDifficultyChips(ThemeData theme) {
    const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];
    return difficulties.map((d) {
      final filterValue = d.toLowerCase();
      final isSelected = _difficultyFilter == filterValue;
      return FilterChip(
        label: Text(d),
        selected: isSelected,
        onSelected: (selected) {
          _difficultyFilter = selected ? filterValue : null;
          _resetAndReload();
        },
      );
    }).toList();
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.history,
            size: 48,
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.3),
          ),
          const SizedBox(height: DesignTokens.spacingSm),
          Text(
            'No games found',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.5),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildGameRow(BuildContext context, GameHistoryEntry game) {
    final theme = Theme.of(context);

    final resultColor = switch (game.result.toLowerCase()) {
      'won' => DesignTokens.successColor,
      'lost' => DesignTokens.errorColor,
      _ => DesignTokens.warningColor,
    };

    final resultIcon = switch (game.result.toLowerCase()) {
      'won' => Icons.emoji_events,
      'lost' => Icons.close,
      _ => Icons.handshake,
    };

    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: DesignTokens.spacingMd,
        vertical: DesignTokens.spacingXs,
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: resultColor.withValues(alpha: 0.15),
          child: Icon(resultIcon, color: resultColor, size: 20),
        ),
        title: Text(
          'vs ${game.opponent}',
          style: theme.textTheme.bodyLarge?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Text(
          '${game.moveCount} moves  •  ${DateFormatter.relative(game.date)}',
          style: theme.textTheme.bodySmall,
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.spacingSm,
            vertical: DesignTokens.spacingXs,
          ),
          decoration: BoxDecoration(
            color: resultColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
          ),
          child: Text(
            game.result.toUpperCase(),
            style: TextStyle(
              color: resultColor,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
        onTap: () {
          // Navigate to replay viewer with the game data.
          context.push('/replay', extra: game);
        },
      ),
    );
  }
}
