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

  bool get notificationsEnabled => _notificationsEnabled;

  Future<void> fetchNotifications() async {
    try {
      final storage = const FlutterSecureStorage();
      final prefs = await SharedPreferences.getInstance();
      final token = await storage.read(key: 'token');
      final memberId = prefs.getString('member_id');

      if (token == null || memberId == null) {
        _notifications = [];
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

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['data'] != null && data['data'] is List) {
          _notifications = (data['data'] as List)
              .map((item) =>
                  AppNotification.fromJson(item as Map<String, dynamic>))
              .toList();
        } else {
          _notifications = [];
        }
      } else {
        _notifications = [];
      }
    } catch (e) {
      _notifications = [];
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

  Future<void> toggleNotifications(bool enabled) async {
    _notificationsEnabled = enabled;
    if (!enabled) {
      await _notificationService.cancelAllNotifications();
    }
    notifyListeners();
  }
}
