import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:international_draughts/core/routing/router.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/shared/utils/validators.dart';
import '../domain/auth_state.dart';
import 'auth_provider.dart';

/// Login screen with email/password form and validation.
class LoginScreen extends ConsumerStatefulWidget {
  /// Creates the [LoginScreen].
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // Navigate on successful authentication.
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next is Authenticated) {
        context.go(AppRoutes.home);
      }
      if (next is AuthErrorState && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message),
            backgroundColor: DesignTokens.errorColor,
          ),
        );
      }
    });

    final isLoading = authState is Loading;

    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(DesignTokens.spacingLg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: DesignTokens.spacingXl),
                Icon(
                  Icons.sports_esports,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: DesignTokens.spacingLg),
                Text(
                  'International Draughts',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: DesignTokens.spacingXl),

                // Error message
                if (authState is AuthErrorState) ...[
                  Container(
                    padding: const EdgeInsets.all(DesignTokens.spacingSm),
                    decoration: BoxDecoration(
                      color: DesignTokens.errorColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(
                        DesignTokens.radiusMd,
                      ),
                    ),
                    child: Text(
                      authState.message,
                      style: const TextStyle(color: DesignTokens.errorColor),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: DesignTokens.spacingMd),
                ],

                // Email field
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  enabled: !isLoading,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: Validators.email,
                ),
                const SizedBox(height: DesignTokens.spacingMd),

                // Password field
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  enabled: !isLoading,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                  validator: Validators.password,
                ),
                const SizedBox(height: DesignTokens.spacingLg),

                // Login button
                ElevatedButton(
                  onPressed: isLoading ? null : _handleLogin,
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Login'),
                ),
                const SizedBox(height: DesignTokens.spacingMd),

                // Register link
                TextButton(
                  onPressed: isLoading
                      ? null
                      : () => context.go(AppRoutes.register),
                  child: const Text("Don't have an account? Register"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
