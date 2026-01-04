import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl =
      'http://ifeloduncms.com.ng/mobile_app2/mobile-api';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  // Get authentication token
  static Future<String?> getToken() async {
    return await _storage.read(key: 'token');
  }

  // Get member ID
  static Future<String?> getMemberId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('member_id');
  }

  // Get user ID
  static Future<String?> getUserId() async {
    return await _storage.read(key: 'member_id');
  }

  // Common headers for authenticated requests
  static Future<Map<String, String>> getAuthHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Authentication endpoints
  static Future<http.Response> login(String identifier, String password) async {
    return await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'identifier': identifier,
        'password': password,
      }),
    );
  }

  // Member endpoints
  static Future<http.Response> getMemberSummary(String memberId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/member/$memberId/summary'),
      headers: headers,
    );
  }

  static Future<http.Response> getMemberHistory(
      String memberId, int fromId, int toId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/member/$memberId/history?from=$fromId&to=$toId'),
      headers: headers,
    );
  }

  static Future<http.Response> getMemberProfile(String memberId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/member/$memberId/profile'),
      headers: headers,
    );
  }

  static Future<http.Response> getMemberSettings(String memberId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/member/$memberId/settings'),
      headers: headers,
    );
  }

  static Future<http.Response> updateMemberSettings(
      String memberId, Map<String, dynamic> settings) async {
    final headers = await getAuthHeaders();
    return await http.put(
      Uri.parse('$baseUrl/member/$memberId/settings'),
      headers: headers,
      body: jsonEncode(settings),
    );
  }

  // Profile endpoints
  static Future<http.Response> getProfile(String memberId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/profile/$memberId'),
      headers: headers,
    );
  }

  static Future<http.Response> updateProfile(
      String memberId, Map<String, dynamic> profileData) async {
    final headers = await getAuthHeaders();
    return await http.put(
      Uri.parse('$baseUrl/profile/$memberId'),
      headers: headers,
      body: jsonEncode(profileData),
    );
  }

  // Notification endpoints
  static Future<http.Response> getNotifications(String userId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/notifications/$userId'),
      headers: headers,
    );
  }

  static Future<http.Response> markNotificationAsRead(
      int notificationId) async {
    final headers = await getAuthHeaders();
    return await http.post(
      Uri.parse('$baseUrl/notifications/$notificationId/read'),
      headers: headers,
    );
  }

  // Password endpoints
  static Future<http.Response> changePassword(
      String userId, String oldPassword, String newPassword) async {
    final headers = await getAuthHeaders();
    return await http.post(
      Uri.parse('$baseUrl/change-password'),
      headers: headers,
      body: jsonEncode({
        'user_id': userId,
        'old_password': oldPassword,
        'new_password': newPassword,
      }),
    );
  }

  // Device endpoints
  static Future<http.Response> updateDeviceId(
      String userId, String deviceId) async {
    return await http.post(
      Uri.parse('$baseUrl/device/update-device'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'device_id': deviceId,
      }),
    );
  }

  // Period endpoints
  static Future<http.Response> getPeriods() async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/period'),
      headers: headers,
    );
  }

  // Additional member data endpoints
  static Future<http.Response> getMemberTransactions(String memberId,
      {int fromPeriod = 1, int toPeriod = 10}) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse(
          '$baseUrl/member/$memberId/history?from=$fromPeriod&to=$toPeriod'),
      headers: headers,
    );
  }

  static Future<http.Response> getMemberLoans(String memberId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/member/$memberId/summary'),
      headers: headers,
    );
  }

  static Future<http.Response> getMemberSavingsShares(String memberId) async {
    final headers = await getAuthHeaders();
    return await http.get(
      Uri.parse('$baseUrl/member/$memberId/summary'),
      headers: headers,
    );
  }

  // Forgot password endpoints
  static Future<http.Response> searchMembers(String name) async {
    return await http.get(
      Uri.parse('$baseUrl/forgot-password/search?name=$name'),
    );
  }

  static Future<http.Response> getMemberEmail(String memberId) async {
    return await http.get(
      Uri.parse('$baseUrl/forgot-password/$memberId/email'),
    );
  }

  static Future<http.Response> sendOTP(String memberId, {String? email}) async {
    final body = <String, dynamic>{};
    if (email != null) body['email'] = email;

    return await http.post(
      Uri.parse('$baseUrl/forgot-password/$memberId/send-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
  }

  static Future<http.Response> verifyOTP(String memberId, String otp) async {
    return await http.post(
      Uri.parse('$baseUrl/forgot-password/$memberId/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'otp': otp}),
    );
  }

  static Future<http.Response> resetPassword(
      String memberId, String otp, String password) async {
    return await http.post(
      Uri.parse('$baseUrl/forgot-password/$memberId/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'otp': otp,
        'password': password,
      }),
    );
  }

  static Future<http.Response> updateEmail(
      String memberId, String email) async {
    return await http.post(
      Uri.parse('$baseUrl/forgot-password/$memberId/update-email'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );
  }
}
