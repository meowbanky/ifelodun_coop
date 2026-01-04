import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LoanSavingProvider with ChangeNotifier {
  bool? allowSavingsWithLoan;
  double? savingsWithLoanAmount;
  bool loading = false;
  String? error;
  String? successMsg;

  Future<void> fetchSettings() async {
    loading = true;
    error = null;
    error = null;
    successMsg = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final memberId = prefs.getString('member_id');
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');

      if (memberId == null || token == null) {
        error = "Missing member or auth token.";
        loading = false;
        notifyListeners();
        return;
      }

      final url = Uri.parse(
          "http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/settings");
      final res = await http.get(
        url,
        headers: {
          "Authorization": "Bearer $token",
          "Accept": "application/json",
        },
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body)['data'];
        allowSavingsWithLoan = data['allow_savings_with_loan'];
        savingsWithLoanAmount =
            (data['savings_with_loan_amount'] as num?)?.toDouble() ?? 0.0;
      } else {
        error = jsonDecode(res.body)['error'] ?? "Failed to fetch settings";
      }
    } catch (e) {
      error = "Error: $e";
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> updateSettings(bool allow, double amount) async {
    loading = true;
    error = null;
    successMsg = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final memberId = prefs.getString('member_id');
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');

      if (memberId == null || token == null) {
        error = "Missing member or auth token.";
        loading = false;
        notifyListeners();
        return false;
      }

      final url = Uri.parse(
          "http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/settings");
      final res = await http.put(
        url,
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
        body: jsonEncode({
          "allow_savings_with_loan": allow,
          "savings_with_loan_amount": amount,
        }),
      );
      print("Update response: ${res.body}");
      if (res.statusCode == 200) {
        successMsg = "Settings updated successfully!";
        allowSavingsWithLoan = allow;
        savingsWithLoanAmount = amount;
        loading = false;
        notifyListeners();
        return true;
      } else {
        error = jsonDecode(res.body)['error'] ?? "Failed to update";
      }
    } catch (e) {
      error = "Error: $e";
    }
    loading = false;
    notifyListeners();
    return false;
  }
}
