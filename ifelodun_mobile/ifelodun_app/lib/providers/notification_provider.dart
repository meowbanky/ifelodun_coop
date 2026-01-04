import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/notification_service.dart';
import '../models/notification.dart';

class NotificationProvider with ChangeNotifier {
  bool _notificationsEnabled = true;
  final NotificationService _notificationService = NotificationService();

  List<AppNotification> _notifications = [];
  List<AppNotification> get notifications => _notifications;
  String? _lastError;
  String? get lastError => _lastError;

  // Filters
  String _category = 'All';
  bool _showUnreadOnly = false;

  String get category => _category;
  bool get showUnreadOnly => _showUnreadOnly;
  List<String> get categories => const ['All', 'System', 'Payments', 'Loans'];
  List<AppNotification> get filteredNotifications {
    Iterable<AppNotification> list = _notifications;
    if (_category != 'All') {
      list = list.where((n) => _mapToCategory(n.title) == _category);
    }
    if (_showUnreadOnly) {
      list = list.where((n) => !n.read);
    }
    return list.toList();
  }

  void setCategory(String value) {
    _category = value;
    notifyListeners();
  }

  void setShowUnreadOnly(bool value) {
    _showUnreadOnly = value;
    notifyListeners();
  }

  String _mapToCategory(String title) {
    final t = title.toLowerCase();
    if (t.contains('loan')) return 'Loans';
    if (t.contains('payment') || t.contains('repay')) return 'Payments';
    return 'System';
  }

  int get unreadCount => _notifications.where((n) => !n.read).length;

  bool get notificationsEnabled => _notificationsEnabled;

  Future<void> fetchNotifications() async {
    try {
      final storage = const FlutterSecureStorage();
      final prefs = await SharedPreferences.getInstance();
      final token = await storage.read(key: 'token');
      final memberId = prefs.getString('member_id');

      if (token == null || memberId == null) {
        _notifications = [];
        _lastError = 'Missing auth: token=${token != null}, member_id=${memberId != null}';
        notifyListeners();
        return;
      }

      final response = await http.get(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/notifications/$memberId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );
      // Debug logs
      // ignore: avoid_print
      print('[Notifications] status: ${response.statusCode}');
      // ignore: avoid_print
      print('[Notifications] body: ${response.body}');

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        List<dynamic>? rawList;
        if (decoded is Map<String, dynamic>) {
          if (decoded['data'] is List) {
            rawList = decoded['data'] as List<dynamic>;
          }
        } else if (decoded is List) {
          rawList = decoded;
        }

        if (rawList != null) {
          _notifications = rawList
              .whereType<Map<String, dynamic>>()
              .map((item) => AppNotification.fromJson(item))
              .toList();
          _lastError = 'Fetched ${_notifications.length} items';
        } else {
          _notifications = [];
          _lastError = 'Unexpected response shape';
        }
      } else {
        _notifications = [];
        _lastError = 'HTTP ${response.statusCode}: ${response.body}';
      }
    } catch (e) {
      _notifications = [];
      _lastError = e.toString();
    }
    notifyListeners();
  }

  Future<void> markAsRead(int id) async {
    try {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');

      if (token == null) return;

      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/notifications/$id/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Update local state
        final idx = _notifications.indexWhere((n) => n.id == id);
        if (idx != -1) {
          _notifications[idx] = AppNotification(
            id: _notifications[idx].id,
            title: _notifications[idx].title,
            body: _notifications[idx].body,
            date: _notifications[idx].date,
            read: true,
          );
          notifyListeners();
        }
      }
    } catch (e) {
      // Handle error silently or show user feedback
    }
  }

  Future<void> markAllAsRead() async {
    try {
      final storage = const FlutterSecureStorage();
      final prefs = await SharedPreferences.getInstance();
      final token = await storage.read(key: 'token');
      final memberId = prefs.getString('member_id');

      if (token == null || memberId == null) return;

      final response = await http.post(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/notifications/$memberId/read-all'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Optimistically mark all as read locally
        _notifications = _notifications
            .map((n) => AppNotification(
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  date: n.date,
                  read: true,
                ))
            .toList();
        notifyListeners();
      }
    } catch (_) {
      // Ignore silently
    }
  }

  Future<void> toggleNotifications(bool enabled) async {
    _notificationsEnabled = enabled;
    if (!enabled) {
      await _notificationService.cancelAllNotifications();
    }
    notifyListeners();
  }
}
