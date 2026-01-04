import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class AuthProvider extends ChangeNotifier {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  bool _isAuthenticated = false;
  String? _token;
  String? _role;
  String? _userName;
  String? _memberId;
  String? _errorMessage;
  bool _useBiometric = false;

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  String? get role => _role;
  String? get userName => _userName;
  String? get memberId => _memberId;
  String? get errorMessage => _errorMessage;
  bool get useBiometric => _useBiometric;

  Future<void> loadBiometricPreference() async {
    final prefs = await SharedPreferences.getInstance();
    _useBiometric = prefs.getBool('use_biometric') ?? false;
    notifyListeners();
  }

  Future<void> setUseBiometric(bool value) async {
    _useBiometric = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('use_biometric', value);
    notifyListeners();
  }

  Future<void> login(String identifier, String password) async {
    _errorMessage = null;
    _isAuthenticated = false;
    notifyListeners();

    try {
      final url = 'http://ifeloduncms.com.ng/mobile_app2/mobile-api/auth/login';
      final requestBody = {'identifier': identifier, 'password': password};

      print('🚀 Making login request to: $url');
      print('📤 Request body: $requestBody');

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      print('📥 Login response status: ${response.statusCode}');
      print('📥 Login response headers: ${response.headers}');
      print('📥 Login response body: ${response.body}');

      try {
        final data = jsonDecode(response.body);
        print('Login response (decoded): $data');
        if (response.statusCode == 200 && data['token'] != null) {
          _token = data['token'];
          _role = data['role'];
          _userName = data['name'] ?? identifier;
          _memberId = data['member_id']?.toString();
          _isAuthenticated = true;

          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('user_name', _userName ?? '');
          if (_memberId != null) await prefs.setString('member_id', _memberId!);

          // Store to secure storage
          await _secureStorage.write(key: 'token', value: _token);
          await _secureStorage.write(key: 'identifier', value: identifier);
          await _secureStorage.write(key: 'password', value: password);
          if (_memberId != null)
            await _secureStorage.write(key: 'member_id', value: _memberId!);

          // Update device ID on backend
          if (_memberId != null) {
            await _updateDeviceId(_memberId!);
          }
        } else {
          _errorMessage = data['error'] ?? 'Login failed';
          print('Login error: $_errorMessage');
          _token = null;
          _isAuthenticated = false;
          _role = null;
          _userName = null;
          _memberId = null;
        }
      } catch (e) {
        // If response is not JSON (e.g., HTML error page), print the raw body
        _errorMessage = 'Unexpected error: ${response.body}';
        print('Unexpected error: ${response.body}');
        _token = null;
        _isAuthenticated = false;
        _role = null;
        _userName = null;
        _memberId = null;
      }
    } catch (e) {
      _errorMessage = 'Network error: ${e.toString()}';
      print('Network error: ${e.toString()}');
      _token = null;
      _isAuthenticated = false;
      _role = null;
      _userName = null;
      _memberId = null;
    }

    notifyListeners();
  }

  Future<void> _updateDeviceId(String userId) async {
    try {
      final deviceId = await FirebaseMessaging.instance.getToken();
      if (deviceId == null) return;
      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/device/update-device'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId, 'device_id': deviceId}),
      );
      print(
          'Device ID update response:  {response.statusCode}  {response.body}');
    } catch (e) {
      print('Error updating device ID: $e');
    }
  }

  Future<void> logout() async {
    _token = null;
    _role = null;
    _memberId = null;
    _isAuthenticated = false;

    final prefs = await SharedPreferences.getInstance();
    // Retain saved username for prefill; clear member and session state
    await prefs.remove('member_id');

    // Clear only sensitive secure items; keep identifier for prefill
    await _secureStorage.delete(key: 'password');
    await _secureStorage.delete(key: 'token');
    await _secureStorage.delete(key: 'member_id');
    // keep: identifier

    notifyListeners();
  }

  Future<void> tryAutoLogin() async {
    final identifier = await _secureStorage.read(key: 'identifier');
    final password = await _secureStorage.read(key: 'password');
    final memberId = await _secureStorage.read(key: 'member_id');
    _memberId = memberId;

    if (identifier != null && password != null) {
      await login(identifier, password);
    }
  }
}
