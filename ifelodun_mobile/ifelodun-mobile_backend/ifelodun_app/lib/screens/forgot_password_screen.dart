import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:go_router/go_router.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  List<Map<String, dynamic>> _searchResults = [];
  Map<String, dynamic>? _selectedMember;
  String? _email;
  bool _isLoading = false;
  bool _otpSent = false;
  bool _otpVerified = false;
  String? _error;
  int _resendCooldown = 0;
  Timer? _resendTimer;
  String _passwordStrength = '';
  bool _showSuccess = false;
  String? _manualEmail;

  // Password visibility states
  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;

  @override
  void dispose() {
    _searchController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _startResendCooldown() {
    setState(() {
      _resendCooldown = 30;
    });
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCooldown > 0) {
        setState(() {
          _resendCooldown--;
        });
      } else {
        timer.cancel();
      }
    });
  }

  void _checkPasswordStrength(String value) {
    if (value.length < 6) {
      _passwordStrength = 'Too short';
    } else if (!RegExp(r'[A-Z]').hasMatch(value)) {
      _passwordStrength = 'Add uppercase letter';
    } else if (!RegExp(r'[0-9]').hasMatch(value)) {
      _passwordStrength = 'Add a number';
    } else if (!RegExp(r'[!@#\$&*~]').hasMatch(value)) {
      _passwordStrength = 'Add a special character';
    } else {
      _passwordStrength = 'Strong';
    }
    setState(() {});
  }

  Future<void> _searchMembers(String query) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await http.get(Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/search?name=$query'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _searchResults = List<Map<String, dynamic>>.from(data['members']);
        });
      } else {
        setState(() {
          _error = 'Error searching members';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchEmail(int memberId) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await http.get(Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/email'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _email = data['email'];
        });
      } else {
        setState(() {
          _error = 'Error fetching email';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _sendOtp(int memberId) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      Uri url = Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/send-otp');
      http.Response response;

      if ((_email == null || _email!.isEmpty) &&
          _manualEmail != null &&
          _manualEmail!.isNotEmpty) {
        response = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': _manualEmail}),
        );
      } else {
        response = await http.post(url);
      }

      if (response.statusCode == 200) {
        setState(() {
          _otpSent = true;
        });
        _startResendCooldown();
      } else {
        setState(() {
          _error = 'Error sending OTP';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _verifyOtp(int memberId) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'otp': _otpController.text.trim()}),
      );
      if (response.statusCode == 200) {
        if (_manualEmail != null && _manualEmail!.isNotEmpty) {
          await _updateEmail(memberId, _manualEmail!);
          setState(() {
            _email = _manualEmail;
          });
        }
        setState(() {
          _otpVerified = true;
        });
      } else {
        setState(() {
          _error = 'Invalid or expired OTP';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _resetPassword(int memberId) async {
    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() {
        _error = 'Passwords do not match';
      });
      return;
    }
    if (_passwordStrength != 'Strong') {
      setState(() {
        _error = 'Password is not strong enough';
      });
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'otp': _otpController.text.trim(),
          'password': _passwordController.text.trim(),
        }),
      );
      if (response.statusCode == 200) {
        setState(() {
          _showSuccess = true;
        });
      } else {
        setState(() {
          _error = 'Error resetting password';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _updateEmail(int memberId, String email) async {
    try {
      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/update-email'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      if (response.statusCode != 200) {
        setState(() {
          _error = 'Failed to update email: ${response.body}';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to update email. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Forgot Password'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364)],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 60),
                child: SingleChildScrollView(
                  child: _showSuccess
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_circle,
                                  color: Colors.green, size: 64),
                              const SizedBox(height: 16),
                              const Text('Password reset successful!',
                                  style: TextStyle(fontSize: 18)),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                icon: const Icon(Icons.login),
                                label: const Text('Back to Login'),
                                onPressed: () => context.go('/login'),
                              ),
                            ],
                          ),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_error != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(8),
                                color: Colors.red.withOpacity(0.1),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error, color: Colors.red),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _error!,
                                        style:
                                            const TextStyle(color: Colors.red),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (_selectedMember == null) ...[
                              TextField(
                                controller: _searchController,
                                decoration: const InputDecoration(
                                  labelText: 'Search member by name',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.search),
                                ),
                                onChanged: (value) {
                                  setState(() {
                                    _error = null;
                                  });
                                  if (value.length > 1) {
                                    _searchMembers(value);
                                  }
                                },
                              ),
                              const SizedBox(height: 8),
                              if (_searchResults.isNotEmpty)
                                ..._searchResults.map(
                                  (member) => ListTile(
                                    title: Text(
                                        '${member['first_name']} ${member['last_name']}'),
                                    onTap: () {
                                      setState(() {
                                        _selectedMember = member;
                                        _searchResults = [];
                                        _error = null;
                                      });
                                      _fetchEmail(member['id']);
                                    },
                                  ),
                                ),
                            ] else ...[
                              Text(
                                'Selected: ${_selectedMember!['first_name']} ${_selectedMember!['last_name']}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              if (_email == null || _email!.isEmpty) ...[
                                const Text('Enter your email:'),
                                TextField(
                                  decoration: const InputDecoration(
                                    labelText: 'Email',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.email),
                                  ),
                                  keyboardType: TextInputType.emailAddress,
                                  onChanged: (val) {
                                    setState(() {
                                      _manualEmail = val;
                                    });
                                  },
                                ),
                                const SizedBox(height: 8),
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.send),
                                  label: const Text('Send OTP'),
                                  onPressed: (_manualEmail != null &&
                                          _manualEmail!.contains('@'))
                                      ? () async {
                                          setState(() {
                                            _email = _manualEmail;
                                          });
                                          _sendOtp(_selectedMember!['id']);
                                        }
                                      : null,
                                ),
                              ] else ...[
                                Row(
                                  children: [
                                    const Icon(Icons.email, color: Colors.blue),
                                    const SizedBox(width: 8),
                                    Text('Email: $_email'),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                if (!_otpSent)
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.send),
                                    label: const Text('Send OTP'),
                                    onPressed: () =>
                                        _sendOtp(_selectedMember!['id']),
                                  ),
                                if (_otpSent && _resendCooldown > 0)
                                  Text(
                                    'Resend OTP in $_resendCooldown seconds',
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                if (_otpSent &&
                                    _resendCooldown == 0 &&
                                    !_otpVerified)
                                  TextButton(
                                    onPressed: () =>
                                        _sendOtp(_selectedMember!['id']),
                                    child: const Text('Resend OTP'),
                                  ),
                              ],
                              if (_otpSent && !_otpVerified) ...[
                                const SizedBox(height: 16),
                                TextField(
                                  controller: _otpController,
                                  decoration: const InputDecoration(
                                    labelText: 'Enter OTP',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.lock),
                                  ),
                                  keyboardType: TextInputType.number,
                                  onChanged: (_) {
                                    setState(() {
                                      _error = null;
                                    });
                                  },
                                ),
                                const SizedBox(height: 8),
                                ElevatedButton(
                                  onPressed: _otpController.text.length == 6
                                      ? () => _verifyOtp(_selectedMember!['id'])
                                      : null,
                                  child: const Text('Verify OTP'),
                                ),
                              ],
                              if (_otpVerified) ...[
                                const SizedBox(height: 16),
                                TextField(
                                  controller: _passwordController,
                                  obscureText: !_isPasswordVisible,
                                  decoration: InputDecoration(
                                    labelText: 'New Password',
                                    border: const OutlineInputBorder(),
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _isPasswordVisible
                                            ? Icons.visibility
                                            : Icons.visibility_off,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _isPasswordVisible =
                                              !_isPasswordVisible;
                                        });
                                      },
                                    ),
                                  ),
                                  onChanged: (value) {
                                    _checkPasswordStrength(value);
                                    setState(() {
                                      _error = null;
                                    });
                                  },
                                ),
                                if (_passwordController.text.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(
                                      'Strength: $_passwordStrength',
                                      style: TextStyle(
                                        color: _passwordStrength == 'Strong'
                                            ? Colors.green
                                            : Colors.orange,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _confirmPasswordController,
                                  obscureText: !_isConfirmPasswordVisible,
                                  decoration: InputDecoration(
                                    labelText: 'Confirm Password',
                                    border: const OutlineInputBorder(),
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _isConfirmPasswordVisible
                                            ? Icons.visibility
                                            : Icons.visibility_off,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _isConfirmPasswordVisible =
                                              !_isConfirmPasswordVisible;
                                        });
                                      },
                                    ),
                                  ),
                                  onChanged: (_) {
                                    setState(() {
                                      _error = null;
                                    });
                                  },
                                ),
                                const SizedBox(height: 8),
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.check),
                                  label: const Text('Reset Password'),
                                  onPressed: _passwordController
                                              .text.isNotEmpty &&
                                          _confirmPasswordController
                                              .text.isNotEmpty &&
                                          _passwordStrength == 'Strong' &&
                                          !_isLoading
                                      ? () =>
                                          _resetPassword(_selectedMember!['id'])
                                      : null,
                                ),
                              ],
                            ],
                          ],
                        ),
                ),
              ),
              if (_isLoading)
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withOpacity(0.1),
                    child: const Center(child: CircularProgressIndicator()),
                  ),
                ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Center(
                      child: TextButton.icon(
                        icon: const Icon(Icons.login),
                        label: const Text('Back to Login'),
                        onPressed: () => context.go('/login'),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
