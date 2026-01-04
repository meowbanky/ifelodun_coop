import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../widgets/app_button.dart';
import '../widgets/app_text_field.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _rememberMe = false;
  String? _storedName;
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSavedData();
  }

  Future<void> _loadSavedData() async {
    final prefs = await SharedPreferences.getInstance();
    final remember = prefs.getBool('remember_me') ?? false;
    final name = prefs.getString('user_name');
    final savedId = await _secureStorage.read(key: 'identifier');
    final savedPw = await _secureStorage.read(key: 'password');
    print('[DEBUG] Remember Me flag: $remember');
    print('[DEBUG] Saved Name: $name');
    print('[DEBUG] Saved Identifier: $savedId');
    print('[DEBUG] Saved Password: $savedPw');

    if (mounted) {
      setState(() {
        _rememberMe = remember;
        _storedName = name;
        if (savedId != null) {
          _identifierController.text = savedId; // prefill identifier always
        }
        if (remember && savedPw != null) {
          _passwordController.text = savedPw; // prefill password only if saved
          print('[DEBUG] Controllers set with saved password');
        }
      });
    }
  }

  Future<void> _login({bool useInputs = true}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    print('🔄 Starting login process...');
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final identifier = useInputs
        ? _identifierController.text.trim()
        : await _secureStorage.read(key: 'identifier') ?? '';
    final password = useInputs
        ? _passwordController.text.trim()
        : await _secureStorage.read(key: 'password') ?? '';

    await authProvider.login(identifier, password);

    setState(() {
      _isLoading = false;
    });

    if (authProvider.isAuthenticated) {
      final prefs = await SharedPreferences.getInstance();
      if (_rememberMe) {
        await prefs.setBool('remember_me', true);
        await prefs.setString('user_name', authProvider.userName ?? '');
        await _secureStorage.write(key: 'identifier', value: identifier);
        await _secureStorage.write(key: 'password', value: password);
        print('[DEBUG] Saved credentials and remember_me flag after login');
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Welcome ${authProvider.userName ?? ''}!')),
      );

      print('Login success, navigating to /');
      GoRouter.of(context).go('/');
    } else if (authProvider.errorMessage != null) {
      setState(() {
        _errorMessage = authProvider.errorMessage;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage!)),
      );
    }
  }

  Future<void> _handleBiometricLogin() async {
    final canCheck = await _localAuth.canCheckBiometrics;
    final isAvailable = await _localAuth.isDeviceSupported();

    if (!canCheck || !isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Biometric authentication not available')),
      );
      return;
    }

    final authenticated = await _localAuth.authenticate(
      localizedReason: 'Login using fingerprint',
      options: const AuthenticationOptions(biometricOnly: true),
    );

    if (authenticated) {
      await _login(useInputs: false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // final media = MediaQuery.of(context).size; // reserved for responsive tweaks
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.background,
              colorScheme.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 12),
                      child: Column(
                        children: [
                          const SizedBox(height: 28),
                          if (_errorMessage != null)
                            if (_errorMessage != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 16),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                      color: Colors.red.withOpacity(0.25)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline,
                                        color: Colors.red),
                                    const SizedBox(width: 10),
                                    Expanded(
                                        child: Text(_errorMessage!,
                                            style: const TextStyle(
                                                color: Colors.red))),
                                  ],
                                ),
                              ),
                          const SizedBox(height: 12),
                          Text(
                            _storedName != null
                                ? 'Welcome, $_storedName'
                                : 'Welcome back',
                            style: theme.textTheme.displaySmall,
                          ),
                          const SizedBox(height: 6),
                          Text("Sign in to continue",
                              style: theme.textTheme.bodySmall),
                          const SizedBox(height: 24),

                          // Form Card
                          Card(
                            elevation: 0,
                            child: Padding(
                              padding:
                                  const EdgeInsets.fromLTRB(18, 20, 18, 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  AppTextField(
                                    controller: _identifierController,
                                    hint: 'Email or username',
                                  ),
                                  const SizedBox(height: 14),
                                  AppTextField(
                                    controller: _passwordController,
                                    hint: 'Password',
                                    obscureText: _obscurePassword,
                                    suffixIcon: IconButton(
                                      icon: Icon(_obscurePassword
                                          ? Icons.visibility_off
                                          : Icons.visibility),
                                      onPressed: () {
                                        setState(() => _obscurePassword =
                                            !_obscurePassword);
                                      },
                                    ),
                                  ),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      onPressed: () =>
                                          context.go('/forgot-password'),
                                      child: const Text('Forgot Password?'),
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      Checkbox(
                                        value: _rememberMe,
                                        onChanged: (val) => setState(
                                            () => _rememberMe = val ?? false),
                                      ),
                                      const Text('Remember me'),
                                      const Spacer(),
                                      IconButton(
                                        onPressed: _handleBiometricLogin,
                                        icon: const Icon(Icons.fingerprint),
                                        tooltip: 'Login with fingerprint',
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  AppButton(
                                    onPressed:
                                        _isLoading ? null : () => _login(),
                                    leadingIcon:
                                        _isLoading ? null : Icons.login_rounded,
                                    child: _isLoading
                                        ? const SizedBox(
                                            width: 22,
                                            height: 22,
                                            child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Colors.white),
                                          )
                                        : const Text('Sign in'),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),
                          Text.rich(
                            TextSpan(
                              text: "Don't have an account? ",
                              children: [
                                WidgetSpan(
                                  child: GestureDetector(
                                    onTap: () => context.go('/register'),
                                    child: Text('sign up',
                                        style: TextStyle(
                                            color: colorScheme.primary,
                                            fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

// Social icon widget removed (unused)
