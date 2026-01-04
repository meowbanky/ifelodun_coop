import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/dashboard_summary.dart';

class DashboardProvider with ChangeNotifier {
  DashboardSummary? _summary;
  bool _loading = false;
  String? _error;

  DashboardSummary? get summary => _summary;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> fetchSummary(String memberId, String? token) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      print('Fetching dashboard summary for memberId: $memberId');
      print('Using token: $token');
      final url = Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/summary');
      final res = await http.get(
        url,
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      print('Response status: ${res.statusCode}, body: ${res.body}');
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        print('Dashboard summary response: $data and memberId: $memberId');
        _summary = DashboardSummary.fromJson(data);
      } else {
        _error = 'Failed to load summary';
      }
    } catch (e) {
      _error = e.toString();
    }
    _loading = false;
    notifyListeners();
  }
}
