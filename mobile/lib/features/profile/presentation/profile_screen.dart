import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:international_draughts/core/routing/router.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/features/auth/domain/auth_state.dart';
import 'package:international_draughts/features/auth/domain/user.dart';
import 'package:international_draughts/features/auth/presentation/auth_provider.dart';
import 'package:international_draughts/features/profile/domain/player_stats.dart';
import 'package:international_draughts/shared/widgets/settings_action_button.dart';

import 'game_history.dart';
import 'profile_provider.dart';
import 'rating_chart.dart';

/// Player profile screen showing stats, rating history, and game history.
///
/// Auth-guarded — redirects to login if not authenticated.
/// Displays: avatar + name header, stats overview, rating chart,
/// and paginated game history with filtering.
class ProfileScreen extends ConsumerStatefulWidget {
  /// Creates the [ProfileScreen].
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isEditingName = false;
  final _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadProfileData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _loadProfileData() {
    final authState = ref.read(authProvider);
    if (authState is Authenticated) {
      ref.read(profileProvider.notifier).loadProfile(authState.user.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final profileState = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          const SettingsActionButton(),
          if (authState is Authenticated)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Logout',
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  context.go(AppRoutes.home);
                }
              },
            ),
        ],
      ),
      body: SafeArea(
        child: switch (authState) {
          Authenticated(:final user) => profileState.isLoading
              ? const Center(child: CircularProgressIndicator())
              : _buildProfileContent(context, user, profileState),
          _ => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person_outline, size: 64),
                  const SizedBox(height: DesignTokens.spacingMd),
                  const Text('Please log in to view your profile.'),
                  const SizedBox(height: DesignTokens.spacingMd),
                  ElevatedButton(
                    onPressed: () => context.go(AppRoutes.login),
                    child: const Text('Login'),
                  ),
                ],
              ),
            ),
        },
      ),
    );
  }

  Widget _buildProfileContent(
    BuildContext context,
    User user,
    ProfileState profileState,
  ) {
    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) => [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.spacingLg),
            child: Column(
              children: [
                _buildProfileHeader(context, user, profileState),
                const SizedBox(height: DesignTokens.spacingLg),
                if (profileState.stats != null)
                  _buildStatsOverview(context, profileState.stats!),
                const SizedBox(height: DesignTokens.spacingLg),
                _buildRatingSection(context, profileState),
              ],
            ),
          ),
        ),
        SliverPersistentHeader(
          pinned: true,
          delegate: _TabBarDelegate(
            TabBar(
              controller: _tabController,
              tabs: const [
                Tab(text: 'Game History'),
                Tab(text: 'Statistics'),
              ],
            ),
            Theme.of(context).scaffoldBackgroundColor,
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabController,
        children: [
          GameHistory(userId: user.id),
          _buildDetailedStats(context, profileState),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(
    BuildContext context,
    User user,
    ProfileState profileState,
  ) {
    final theme = Theme.of(context);
    final profile = profileState.profile;
    final avatar = profile?.avatar ?? '🎮';
    final displayName = profile?.displayName ?? user.displayName ?? 'Player';
    final rating = profile?.rating ?? 1500;

    return Row(
      children: [
        // Avatar
        GestureDetector(
          onTap: () => _showAvatarSelector(context, user.id),
          child: CircleAvatar(
            radius: 36,
            backgroundColor:
                theme.colorScheme.primaryContainer,
            child: Text(
              avatar,
              style: const TextStyle(fontSize: 32),
            ),
          ),
        ),
        const SizedBox(width: DesignTokens.spacingMd),
        // Name and rating
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_isEditingName)
                _buildNameEditor(context, user.id)
              else
                GestureDetector(
                  onTap: () {
                    _nameController.text = displayName;
                    setState(() => _isEditingName = true);
                  },
                  child: Row(
                    children: [
                      Flexible(
                        child: Text(
                          displayName,
                          style: theme.textTheme.titleLarge,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: DesignTokens.spacingXs),
                      Icon(
                        Icons.edit,
                        size: 16,
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: DesignTokens.spacingXs),
              Text(
                user.email,
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: DesignTokens.spacingXs),
              Row(
                children: [
                  Icon(
                    Icons.star,
                    size: 18,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Rating: ${rating.toInt()}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNameEditor(BuildContext context, String userId) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _nameController,
            autofocus: true,
            decoration: const InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(
                horizontal: DesignTokens.spacingSm,
                vertical: DesignTokens.spacingXs,
              ),
            ),
            onSubmitted: (value) => _saveName(userId, value),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.check, size: 20),
          onPressed: () => _saveName(userId, _nameController.text),
        ),
        IconButton(
          icon: const Icon(Icons.close, size: 20),
          onPressed: () => setState(() => _isEditingName = false),
        ),
      ],
    );
  }

  Future<void> _saveName(String userId, String name) async {
    if (name.trim().isEmpty) return;
    await ref
        .read(profileProvider.notifier)
        .updateDisplayName(userId, name.trim());
    if (mounted) {
      setState(() => _isEditingName = false);
    }
  }

  void _showAvatarSelector(BuildContext context, String userId) {
    const avatars = [
      '🎮', '♟️', '🏆', '👑', '🎯', '⚡',
      '🔥', '💎', '🌟', '🎲', '🦁', '🐉',
    ];

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Avatar'),
        content: SizedBox(
          width: 280,
          child: GridView.builder(
            shrinkWrap: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: DesignTokens.spacingSm,
              crossAxisSpacing: DesignTokens.spacingSm,
            ),
            itemCount: avatars.length,
            itemBuilder: (context, index) {
              return InkWell(
                onTap: () {
                  ref
                      .read(profileProvider.notifier)
                      .updateAvatar(userId, avatars[index]);
                  Navigator.of(context).pop();
                },
                borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                    borderRadius:
                        BorderRadius.circular(DesignTokens.radiusMd),
                  ),
                  child: Center(
                    child: Text(
                      avatars[index],
                      style: const TextStyle(fontSize: 28),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsOverview(BuildContext context, PlayerStats stats) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Overview', style: theme.textTheme.titleMedium),
        const SizedBox(height: DesignTokens.spacingSm),

        // Stats cards row
        Row(
          children: [
            _buildStatCard(
              context,
              label: 'Games',
              value: '${stats.totalGames}',
              icon: Icons.sports_esports,
            ),
            const SizedBox(width: DesignTokens.spacingSm),
            _buildStatCard(
              context,
              label: 'Wins',
              value: '${stats.wins}',
              icon: Icons.emoji_events,
              color: DesignTokens.successColor,
            ),
            const SizedBox(width: DesignTokens.spacingSm),
            _buildStatCard(
              context,
              label: 'Losses',
              value: '${stats.losses}',
              icon: Icons.close,
              color: DesignTokens.errorColor,
            ),
            const SizedBox(width: DesignTokens.spacingSm),
            _buildStatCard(
              context,
              label: 'Draws',
              value: '${stats.draws}',
              icon: Icons.handshake,
              color: DesignTokens.warningColor,
            ),
          ],
        ),
        const SizedBox(height: DesignTokens.spacingMd),

        // Win rate bar
        if (stats.totalGames > 0) ...[
          Text(
            'Win Rate',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: DesignTokens.spacingXs),
          ClipRRect(
            borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
            child: SizedBox(
              height: 12,
              child: Row(
                children: [
                  Expanded(
                    flex: (stats.winRate * 100).round(),
                    child: Container(color: DesignTokens.successColor),
                  ),
                  if (stats.drawRate > 0)
                    Expanded(
                      flex: (stats.drawRate * 100).round(),
                      child: Container(color: DesignTokens.warningColor),
                    ),
                  Expanded(
                    flex: (stats.lossRate * 100).round(),
                    child: Container(color: DesignTokens.errorColor),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.spacingXs),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${(stats.winRate * 100).toStringAsFixed(1)}% win',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: DesignTokens.successColor,
                ),
              ),
              Text(
                '${(stats.drawRate * 100).toStringAsFixed(1)}% draw',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: DesignTokens.warningColor,
                ),
              ),
              Text(
                '${(stats.lossRate * 100).toStringAsFixed(1)}% loss',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: DesignTokens.errorColor,
                ),
              ),
            ],
          ),
        ],

        // Streak info
        const SizedBox(height: DesignTokens.spacingMd),
        Row(
          children: [
            _buildStreakChip(
              context,
              label: 'Current Streak',
              value: stats.currentStreak,
            ),
            const SizedBox(width: DesignTokens.spacingMd),
            _buildStreakChip(
              context,
              label: 'Best Streak',
              value: stats.bestStreak,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required String label,
    required String value,
    required IconData icon,
    Color? color,
  }) {
    final theme = Theme.of(context);
    final cardColor = color ?? theme.colorScheme.primary;

    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(DesignTokens.spacingSm),
          child: Column(
            children: [
              Icon(icon, color: cardColor, size: 20),
              const SizedBox(height: DesignTokens.spacingXs),
              Text(
                value,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                label,
                style: theme.textTheme.bodySmall,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStreakChip(
    BuildContext context, {
    required String label,
    required int value,
  }) {
    final theme = Theme.of(context);
    return Chip(
      avatar: Icon(
        Icons.local_fire_department,
        size: 18,
        color: value > 0 ? Colors.orange : theme.colorScheme.onSurface,
      ),
      label: Text('$label: $value'),
    );
  }

  Widget _buildRatingSection(BuildContext context, ProfileState profileState) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Rating History', style: theme.textTheme.titleMedium),
        const SizedBox(height: DesignTokens.spacingSm),
        RatingChart(entries: profileState.ratingHistory),
      ],
    );
  }

  Widget _buildDetailedStats(BuildContext context, ProfileState profileState) {
    final stats = profileState.stats;
    if (stats == null) {
      return const Center(child: Text('No statistics available.'));
    }

    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(DesignTokens.spacingMd),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.spacingMd),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Game Summary',
                    style: theme.textTheme.titleMedium,),
                const Divider(),
                _statRow('Total Games', '${stats.totalGames}'),
                _statRow('Wins', '${stats.wins}'),
                _statRow('Losses', '${stats.losses}'),
                _statRow('Draws', '${stats.draws}'),
                _statRow(
                  'Win Rate',
                  '${(stats.winRate * 100).toStringAsFixed(1)}%',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: DesignTokens.spacingMd),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.spacingMd),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Streaks', style: theme.textTheme.titleMedium),
                const Divider(),
                _statRow('Current Streak', '${stats.currentStreak}'),
                _statRow('Best Streak', '${stats.bestStreak}'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _statRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: DesignTokens.spacingXs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

/// Delegate for pinning the TabBar in the NestedScrollView.
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this._tabBar, this._backgroundColor);

  final TabBar _tabBar;
  final Color _backgroundColor;

  @override
  double get minExtent => _tabBar.preferredSize.height;

  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: _backgroundColor,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
