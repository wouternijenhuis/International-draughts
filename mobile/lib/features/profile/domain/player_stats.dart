/// Represents a player's game statistics.
class PlayerStats {
  /// Creates a [PlayerStats].
  const PlayerStats({
    this.totalGames = 0,
    this.wins = 0,
    this.losses = 0,
    this.draws = 0,
    this.currentStreak = 0,
    this.bestStreak = 0,
  });

  /// Creates a [PlayerStats] from a JSON map.
  factory PlayerStats.fromJson(Map<String, dynamic> json) {
    return PlayerStats(
      totalGames: json['totalGames'] as int? ?? 0,
      wins: json['wins'] as int? ?? 0,
      losses: json['losses'] as int? ?? 0,
      draws: json['draws'] as int? ?? 0,
      currentStreak: json['currentStreak'] as int? ?? 0,
      bestStreak: json['bestStreak'] as int? ?? 0,
    );
  }

  /// Total games played.
  final int totalGames;

  /// Total wins.
  final int wins;

  /// Total losses.
  final int losses;

  /// Total draws.
  final int draws;

  /// Current winning streak.
  final int currentStreak;

  /// Best winning streak ever.
  final int bestStreak;

  /// Win rate as a fraction (0.0 to 1.0).
  double get winRate => totalGames > 0 ? wins / totalGames : 0.0;

  /// Loss rate as a fraction (0.0 to 1.0).
  double get lossRate => totalGames > 0 ? losses / totalGames : 0.0;

  /// Draw rate as a fraction (0.0 to 1.0).
  double get drawRate => totalGames > 0 ? draws / totalGames : 0.0;

  /// Converts to JSON map.
  Map<String, dynamic> toJson() {
    return {
      'totalGames': totalGames,
      'wins': wins,
      'losses': losses,
      'draws': draws,
      'currentStreak': currentStreak,
      'bestStreak': bestStreak,
    };
  }

  @override
  String toString() =>
      'PlayerStats(games: $totalGames, W: $wins, L: $losses, D: $draws)';
}

/// A single rating history data point.
class RatingHistoryEntry {
  /// Creates a [RatingHistoryEntry].
  const RatingHistoryEntry({
    required this.date,
    required this.rating,
    required this.deviation,
  });

  /// Creates a [RatingHistoryEntry] from a JSON map.
  factory RatingHistoryEntry.fromJson(Map<String, dynamic> json) {
    return RatingHistoryEntry(
      date: DateTime.parse(json['date'] as String),
      rating: (json['rating'] as num).toDouble(),
      deviation: (json['deviation'] as num?)?.toDouble() ?? 0,
    );
  }

  /// Date of the rating snapshot.
  final DateTime date;

  /// Rating value.
  final double rating;

  /// Rating deviation (uncertainty) at this point.
  final double deviation;
}

/// A game history entry for display in the game list.
class GameHistoryEntry {
  /// Creates a [GameHistoryEntry].
  const GameHistoryEntry({
    required this.id,
    required this.opponent,
    required this.result,
    required this.moveCount,
    required this.date,
    required this.difficulty,
    required this.mode,
    this.moves = const [],
  });

  /// Creates a [GameHistoryEntry] from a JSON map.
  factory GameHistoryEntry.fromJson(Map<String, dynamic> json) {
    return GameHistoryEntry(
      id: json['id'] as String,
      opponent: json['opponent'] as String? ?? 'AI',
      result: json['result'] as String,
      moveCount: json['moveCount'] as int? ?? 0,
      date: DateTime.parse(json['date'] as String),
      difficulty: json['difficulty'] as String? ?? '',
      mode: json['mode'] as String? ?? 'vsAi',
      moves: (json['moves'] as List<dynamic>?)
              ?.map((m) => m as String)
              .toList() ??
          const [],
    );
  }

  /// Unique game identifier.
  final String id;

  /// Opponent name or AI level.
  final String opponent;

  /// Game result: 'won', 'lost', 'draw'.
  final String result;

  /// Total number of moves in the game.
  final int moveCount;

  /// Date the game was played.
  final DateTime date;

  /// AI difficulty level (if vs AI).
  final String difficulty;

  /// Game mode (vsAi, vsHuman, etc.).
  final String mode;

  /// Move notations for replay.
  final List<String> moves;

  /// Converts to JSON map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'opponent': opponent,
      'result': result,
      'moveCount': moveCount,
      'date': date.toIso8601String(),
      'difficulty': difficulty,
      'mode': mode,
      'moves': moves,
    };
  }
}

/// Paginated response for game history.
class GameHistoryPage {
  /// Creates a [GameHistoryPage].
  const GameHistoryPage({
    required this.games,
    required this.totalCount,
    required this.page,
    required this.pageSize,
  });

  /// Creates a [GameHistoryPage] from a JSON map.
  factory GameHistoryPage.fromJson(Map<String, dynamic> json) {
    return GameHistoryPage(
      games: (json['games'] as List<dynamic>?)
              ?.map(
                (g) => GameHistoryEntry.fromJson(g as Map<String, dynamic>),
              )
              .toList() ??
          const [],
      totalCount: json['totalCount'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      pageSize: json['pageSize'] as int? ?? 20,
    );
  }

  /// The games on this page.
  final List<GameHistoryEntry> games;

  /// Total number of games matching the filter.
  final int totalCount;

  /// Current page number (1-based).
  final int page;

  /// Number of games per page.
  final int pageSize;

  /// Whether there are more pages.
  bool get hasMore => page * pageSize < totalCount;
}
