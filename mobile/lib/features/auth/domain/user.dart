/// Represents an authenticated user.
class User {
  /// Creates a [User].
  const User({
    required this.id,
    required this.email,
    this.displayName,
  });

  /// Creates a [User] from a JSON map.
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String?,
    );
  }

  /// Unique user identifier.
  final String id;

  /// User email address.
  final String email;

  /// Optional display name.
  final String? displayName;

  /// Converts this user to a JSON map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'displayName': displayName,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is User && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'User(id: $id, email: $email)';
}
