# Keep Flutter Dart code
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.embedding.** { *; }

# Keep the entry point
-keep class com.internationaldrauts.international_draughts.** { *; }

# Keep Kotlin and coroutines
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# Keep secure storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Keep connectivity_plus
-keep class dev.flutternetwork.** { *; }

# Google Play Core (optional deferred components — not used, suppress R8 warnings)
-dontwarn com.google.android.play.core.splitcompat.SplitCompatApplication
-dontwarn com.google.android.play.core.splitinstall.SplitInstallException
-dontwarn com.google.android.play.core.splitinstall.SplitInstallManager
-dontwarn com.google.android.play.core.splitinstall.SplitInstallManagerFactory
-dontwarn com.google.android.play.core.splitinstall.SplitInstallRequest$Builder
-dontwarn com.google.android.play.core.splitinstall.SplitInstallRequest
-dontwarn com.google.android.play.core.splitinstall.SplitInstallSessionState
-dontwarn com.google.android.play.core.splitinstall.SplitInstallStateUpdatedListener
-dontwarn com.google.android.play.core.tasks.OnFailureListener
-dontwarn com.google.android.play.core.tasks.OnSuccessListener
-dontwarn com.google.android.play.core.tasks.Task

# Suppress warnings for optional dependencies
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
