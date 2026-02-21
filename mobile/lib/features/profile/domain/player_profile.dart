/// Represents a player's profile information.
class PlayerProfile {
  /// Creates a [PlayerProfile].
  const PlayerProfile({
    required this.userId,
    required this.email,
    required this.createdAt, this.displayName,
    this.avatar,
    this.rating = 1500,
    this.ratingDeviation = 350,
  });

  /// Creates a [PlayerProfile] from a JSON map.
  factory PlayerProfile.fromJson(Map<String, dynamic> json) {
    return PlayerProfile(
      userId: json['userId'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String?,
      avatar: json['avatar'] as String?,
      rating: (json['rating'] as num?)?.toDouble() ?? 1500,
      ratingDeviation: (json['ratingDeviation'] as num?)?.toDouble() ?? 350,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// Unique user identifier.
  final String userId;

  /// Email address.
  final String email;

  /// Display name (can be updated).
  final String? displayName;

  /// Avatar emoji string.
  final String? avatar;

  /// Current Glicko-2 rating.
  final double rating;

  /// Rating deviation (uncertainty).
  final double ratingDeviation;

  /// Account creation date.
  final DateTime createdAt;

  /// Converts to JSON map.
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'email': email,
      'displayName': displayName,
      'avatar': avatar,
      'rating': rating,
      'ratingDeviation': ratingDeviation,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  /// Creates a copy with the given fields replaced.
  PlayerProfile copyWith({
    String? displayName,
    String? avatar,
    double? rating,
    double? ratingDeviation,
  }) {
    return PlayerProfile(
      userId: userId,
      email: email,
      displayName: displayName ?? this.displayName,
      avatar: avatar ?? this.avatar,
      rating: rating ?? this.rating,
      ratingDeviation: ratingDeviation ?? this.ratingDeviation,
      createdAt: createdAt,
    );
  }

  @override
  String toString() =>
      'PlayerProfile(userId: $userId, displayName: $displayName)';
}
