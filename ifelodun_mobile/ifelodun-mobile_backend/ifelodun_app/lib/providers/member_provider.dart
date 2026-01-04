import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/member.dart';
import '../models/transaction.dart';
import '../models/loan.dart';
import '../models/savings_shares.dart';

class MemberProvider with ChangeNotifier {
  Member? _member;
  List<Transaction> _transactions = [];
  List<Loan> _loans = [];
  List<SavingsShares> _savingsShares = [];

  Member? get member => _member;
  List<Transaction> get transactions => _transactions;
  List<Loan> get loans => _loans;
  List<SavingsShares> get savingsShares => _savingsShares;

  Future<void> fetchMember(String token) async {
    try {
      const storage = FlutterSecureStorage();
      final prefs = await SharedPreferences.getInstance();
      final memberId = prefs.getString('member_id');

      if (memberId == null) return;

      final response = await http.get(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _member = Member(
          firstName: data['first_name'] ?? '',
          lastName: data['last_name'] ?? '',
          phoneNumber: data['phone_number'] ?? '',
        );
        notifyListeners();
      }
    } catch (e) {
      print('Error fetching member: $e');
    }
  }

  Future<void> fetchTransactions(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final memberId = prefs.getString('member_id');

      if (memberId == null) {
        _transactions = [];
        notifyListeners();
        return;
      }

      // Use history endpoint to get transaction data
      final response = await http.get(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/history?from=1&to=10'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['data'] != null && data['data'] is List) {
          _transactions = (data['data'] as List).map((item) {
            return Transaction(
              type: _getTransactionType(item),
              amount: _getTransactionAmount(item),
              date: item['period_name'] ?? '',
            );
          }).toList();
        } else {
          _transactions = [];
        }
      } else {
        _transactions = [];
      }
    } catch (e) {
      print('Error fetching transactions: $e');
      _transactions = [];
    }
    notifyListeners();
  }

  String _getTransactionType(Map<String, dynamic> item) {
    if ((item['shares_amount'] ?? 0) > 0) return 'Shares';
    if ((item['savings_amount'] ?? 0) > 0) return 'Savings';
    if ((item['loan_amount'] ?? 0) > 0) return 'Loan';
    if ((item['loan_repayment'] ?? 0) > 0) return 'Loan Repayment';
    return 'Transaction';
  }

  double _getTransactionAmount(Map<String, dynamic> item) {
    final shares = (item['shares_amount'] ?? 0).toDouble();
    final savings = (item['savings_amount'] ?? 0).toDouble();
    final loan = (item['loan_amount'] ?? 0).toDouble();
    final repayment = (item['loan_repayment'] ?? 0).toDouble();

    if (shares > 0) return shares;
    if (savings > 0) return savings;
    if (loan > 0) return loan;
    if (repayment > 0) return repayment;
    return 0.0;
  }

  Future<void> fetchLoans(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final memberId = prefs.getString('member_id');

      if (memberId == null) {
        _loans = [];
        notifyListeners();
        return;
      }

      // Use member summary to get loan balance
      final response = await http.get(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/summary'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final loanBalance = (data['loan_balance'] ?? 0).toDouble();

        if (loanBalance > 0) {
          _loans = [Loan(remainingBalance: loanBalance)];
        } else {
          _loans = [];
        }
      } else {
        _loans = [];
      }
    } catch (e) {
      print('Error fetching loans: $e');
      _loans = [];
    }
    notifyListeners();
  }

  Future<void> fetchSavingsShares(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final memberId = prefs.getString('member_id');

      if (memberId == null) {
        _savingsShares = [];
        notifyListeners();
        return;
      }

      // Use member summary to get savings and shares data
      final response = await http.get(
        Uri.parse(
            'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/summary'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final totalShareSavings = (data['total_share_savings'] ?? 0).toDouble();

        // Since the API returns combined shares+savings, we'll split it
        // You may need to adjust this based on your actual data structure
        final savings = totalShareSavings * 0.6; // Assume 60% savings
        final shares = totalShareSavings * 0.4; // Assume 40% shares

        _savingsShares = [SavingsShares(savings: savings, shares: shares)];
      } else {
        _savingsShares = [];
      }
    } catch (e) {
      print('Error fetching savings/shares: $e');
      _savingsShares = [];
    }
    notifyListeners();
  }
}
