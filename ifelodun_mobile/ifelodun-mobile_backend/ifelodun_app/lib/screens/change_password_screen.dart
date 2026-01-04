import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({Key? key}) : super(key: key);

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  String? _success;

  // Password visibility states
  bool _isOldPasswordVisible = false;
  bool _isNewPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<String?> _getUserId() async {
    const storage = FlutterSecureStorage();
    return await storage.read(key: 'member_id');
  }

  Future<void> _changePassword() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });

    try {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');

      if (token == null) {
        setState(() {
          _error = 'Authentication token not found. Please login again.';
          _isLoading = false;
        });
        return;
      }

      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'user_id': await _getUserId(), // Add user_id as required by PHP API
          'old_password': _oldPasswordController.text.trim(),
          'new_password': _newPasswordController.text.trim(),
        }),
      );

      if (response.statusCode == 200) {
        setState(() {
          _success = 'Password changed successfully!';
          _isLoading = false;
        });
        _oldPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      } else {
        final data = jsonDecode(response.body);
        setState(() {
          _error = data['error'] ?? 'Failed to change password';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Simple strength calculation for visual feedback only
    int strength = 0;
    final newVal = _newPasswordController.text;
    if (newVal.isNotEmpty) strength++;
    if (RegExp(r'[A-Z]').hasMatch(newVal)) strength++;
    if (RegExp(r'[0-9]').hasMatch(newVal)) strength++;
    if (RegExp(r'[!@#\$&*~]').hasMatch(newVal)) strength++;

    Color strengthColor;
    String strengthLabel;
    switch (strength) {
      case 0:
      case 1:
        strengthColor = Colors.redAccent;
        strengthLabel = 'Weak';
        break;
      case 2:
        strengthColor = Colors.orange;
        strengthLabel = 'Fair';
        break;
      case 3:
        strengthColor = Colors.amber;
        strengthLabel = 'Good';
        break;
      default:
        strengthColor = Colors.green;
        strengthLabel = 'Strong';
    }

    InputDecoration inputDecoration(
        {required String label,
        required bool isObscured,
        required VoidCallback onToggle,
        IconData prefix = Icons.lock_outline}) {
      return InputDecoration(
        labelText: label,
        prefixIcon: Icon(prefix),
        filled: true,
        fillColor: theme.colorScheme.surface.withValues(alpha: 0.9),
        contentPadding:
            const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:
              BorderSide(color: theme.dividerColor.withValues(alpha: 0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: theme.colorScheme.primary, width: 1.5),
        ),
        suffixIcon: IconButton(
          icon: Icon(isObscured ? Icons.visibility : Icons.visibility_off),
          onPressed: onToggle,
        ),
      );
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Change Password'),
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
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, kToolbarHeight + 24, 24, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Material(
                elevation: 10,
                borderRadius: BorderRadius.circular(20),
                color: theme.colorScheme.surface,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 26,
                              backgroundColor: theme.colorScheme.primary
                                  .withValues(alpha: 0.15),
                              child: Icon(Icons.lock_reset,
                                  color: theme.colorScheme.primary, size: 28),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Update your password',
                                      style: theme.textTheme.titleLarge
                                          ?.copyWith(
                                              fontWeight: FontWeight.w700)),
                                  const SizedBox(height: 4),
                                  Text(
                                      'Keep your account secure with a strong password',
                                      style: theme.textTheme.bodyMedium
                                          ?.copyWith(color: theme.hintColor)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color: Colors.red.withValues(alpha: 0.25)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline,
                                    color: Colors.red),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(_error!,
                                      style:
                                          const TextStyle(color: Colors.red)),
                                ),
                              ],
                            ),
                          ),
                        if (_success != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color: Colors.green.withOpacity(0.25)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle_outline,
                                    color: Colors.green),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(_success!,
                                      style:
                                          const TextStyle(color: Colors.green)),
                                ),
                              ],
                            ),
                          ),

                        TextFormField(
                          controller: _oldPasswordController,
                          obscureText: !_isOldPasswordVisible,
                          decoration: inputDecoration(
                            label: 'Old Password',
                            isObscured: _isOldPasswordVisible,
                            onToggle: () => setState(() =>
                                _isOldPasswordVisible = !_isOldPasswordVisible),
                          ),
                          validator: (value) => value == null || value.isEmpty
                              ? 'Enter your old password'
                              : null,
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _newPasswordController,
                          obscureText: !_isNewPasswordVisible,
                          onChanged: (_) => setState(() {}),
                          decoration: inputDecoration(
                            label: 'New Password',
                            isObscured: _isNewPasswordVisible,
                            onToggle: () => setState(() =>
                                _isNewPasswordVisible = !_isNewPasswordVisible),
                          ).copyWith(
                            helperText:
                                'Use 6+ chars, with uppercase, number and symbol',
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Enter a new password';
                            }
                            if (value.length < 6) {
                              return 'Password must be at least 6 characters';
                            }
                            if (!RegExp(r'[A-Z]').hasMatch(value)) {
                              return 'Add an uppercase letter';
                            }
                            if (!RegExp(r'[0-9]').hasMatch(value)) {
                              return 'Add a number';
                            }
                            if (!RegExp(r'[!@#\$&*~]').hasMatch(value)) {
                              return 'Add a special character';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),

                        // Strength meter
                        Row(
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: LinearProgressIndicator(
                                  value: (strength / 4).clamp(0, 1),
                                  minHeight: 8,
                                  backgroundColor:
                                      theme.disabledColor.withOpacity(0.2),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      strengthColor),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(strengthLabel,
                                style: TextStyle(
                                    color: strengthColor,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),

                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: !_isConfirmPasswordVisible,
                          decoration: inputDecoration(
                            label: 'Confirm New Password',
                            isObscured: _isConfirmPasswordVisible,
                            onToggle: () => setState(() =>
                                _isConfirmPasswordVisible =
                                    !_isConfirmPasswordVisible),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Confirm your new password';
                            }
                            if (value != _newPasswordController.text) {
                              return 'Passwords do not match';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 24),
                        SizedBox(
                          height: 52,
                          child: ElevatedButton.icon(
                            icon: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.lock_open),
                            label: Text(
                                _isLoading ? 'Updating...' : 'Change Password'),
                            style: ElevatedButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14)),
                              textStyle:
                                  const TextStyle(fontWeight: FontWeight.w600),
                              backgroundColor: theme.colorScheme.primary,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: _isLoading
                                ? null
                                : () {
                                    if (_formKey.currentState!.validate()) {
                                      _changePassword();
                                    }
                                  },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
