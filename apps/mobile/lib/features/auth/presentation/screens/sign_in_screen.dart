import 'package:flutter/material.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../data/repositories/auth_repository.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({
    super.key,
    required this.authRepository,
    required this.sessionController,
  });

  final AuthRepository authRepository;
  final SessionController sessionController;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _fullNameController = TextEditingController();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isRegisterMode = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();

    final identifier = _identifierController.text.trim();
    final password = _passwordController.text.trim();
    final fullName = _fullNameController.text.trim();

    if (identifier.isEmpty || password.isEmpty || (_isRegisterMode && fullName.isEmpty)) {
      _showMessage('Complete the required fields.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final session = _isRegisterMode
          ? await widget.authRepository.register(
              fullName: fullName,
              identifier: identifier,
              password: password,
            )
          : await widget.authRepository.signIn(
              identifier: identifier,
              password: password,
            );

      await widget.sessionController.save(session);
    } on ApiException catch (error) {
      _showMessage(error.message);
    } catch (_) {
      _showMessage('Unable to complete the request.');
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _isRegisterMode ? 'Create account' : 'Sign in';
    final subtitle = _isRegisterMode
        ? 'Create a citizen account and start reporting city issues.'
        : 'Sign in to track issues, submit reports, and receive district updates.';

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE8F6F2), Color(0xFFF6F7F9), Color(0xFFDDECE8)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('MyCity', style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 12),
                    Text(subtitle),
                    const SizedBox(height: 28),
                    if (_isRegisterMode) ...[
                      TextField(
                        controller: _fullNameController,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(labelText: 'Full name'),
                      ),
                      const SizedBox(height: 14),
                    ],
                    TextField(
                      controller: _identifierController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'Email or phone'),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      onSubmitted: (_) => _submit(),
                      decoration: const InputDecoration(labelText: 'Password'),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _isSubmitting ? null : _submit,
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(title),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _isSubmitting
                          ? null
                          : () {
                              setState(() => _isRegisterMode = !_isRegisterMode);
                            },
                      child: Text(
                        _isRegisterMode
                            ? 'Already have an account? Sign in'
                            : 'Need an account? Create one',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
