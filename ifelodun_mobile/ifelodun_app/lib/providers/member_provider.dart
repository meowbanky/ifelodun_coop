import 'package:flutter/material.dart';
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
    await Future.delayed(const Duration(seconds: 1)); // Simulate API call
    _member = Member(
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '08012345678',
    );
    notifyListeners();
  }

  Future<void> fetchTransactions(String token) async {
    await Future.delayed(const Duration(seconds: 1)); // Simulate API call
    _transactions = [
      Transaction(type: 'Deposit', amount: 5000.0, date: '2025-05-31'),
    ];
    notifyListeners();
  }

  Future<void> fetchLoans(String token) async {
    await Future.delayed(const Duration(seconds: 1)); // Simulate API call
    _loans = [Loan(remainingBalance: 10000.0)];
    notifyListeners();
  }

  Future<void> fetchSavingsShares(String token) async {
    await Future.delayed(const Duration(seconds: 1)); // Simulate API call
    _savingsShares = [SavingsShares(savings: 2000.0, shares: 1000.0)];
    notifyListeners();
  }
}
