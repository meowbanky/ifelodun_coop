import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
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
        if (remember && savedId != null && savedPw != null) {
          _identifierController.text = savedId;
          _passwordController.text = savedPw;
          print('[DEBUG] Controllers set with saved credentials');
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
    final media = MediaQuery.of(context).size;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          Positioned(
            top: -media.width * 0.6,
            right: -media.width * 0.3,
            child: Container(
              height: media.width * 1.2,
              width: media.width * 1.2,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Color(0xFFE0C3FC), Color(0xFF8EC5FC)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
              ),
            ),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints:
                        BoxConstraints(minHeight: constraints.maxHeight),
                    child: IntrinsicHeight(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          children: [
                            const SizedBox(height: 40),
                            if (_errorMessage != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 16),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error, color: Colors.red),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style:
                                            const TextStyle(color: Colors.red),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            Text(
                              _storedName != null
                                  ? 'Welcome, $_storedName'
                                  : 'Login',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text.rich(
                              TextSpan(
                                text: "Don't have an account? ",
                                children: [
                                  WidgetSpan(
                                    child: GestureDetector(
                                      onTap: () {
                                        context.go('/register');
                                      },
                                      child: Text(
                                        'sign up',
                                        style: TextStyle(
                                            color: colorScheme.primary,
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 160),
                            TextField(
                              controller: _identifierController,
                              decoration: InputDecoration(
                                prefixText: '@ ',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                hintText: 'email/username',
                                hintStyle: TextStyle(
                                  color: colorScheme.onSurface.withOpacity(0.6),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              decoration: InputDecoration(
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                hintText: 'Password',
                                hintStyle: TextStyle(
                                  color: colorScheme.onSurface.withOpacity(0.6),
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscurePassword
                                      ? Icons.visibility_off
                                      : Icons.visibility),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                              ),
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {
                                  context.go('/forgot-password');
                                },
                                child: Text(
                                  'Forgot Password?',
                                  style: TextStyle(color: colorScheme.primary),
                                ),
                              ),
                            ),
                            Row(
                              children: [
                                Checkbox(
                                  value: _rememberMe,
                                  onChanged: (val) {
                                    setState(() {
                                      _rememberMe = val ?? false;
                                    });
                                  },
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
                            ElevatedButton.icon(
                              onPressed: _isLoading ? null : () => _login(),
                              icon: _isLoading
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : const Icon(Icons.login),
                              label:
                                  Text(_isLoading ? 'Logging in...' : 'Login'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: colorScheme.primary,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 80, vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                            ),
                            Spacer(),
                            Column(
                              children: [
                                SizedBox(height: 32),
                                // Social login removed
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialIcon extends StatelessWidget {
  final IconData icon;
  final Color? color;

  const _SocialIcon({required this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CircleAvatar(
      backgroundColor:
          color?.withOpacity(0.1) ?? theme.colorScheme.surface.withOpacity(0.1),
      child: Icon(icon, color: color ?? theme.colorScheme.onSurface),
    );
  }
}
