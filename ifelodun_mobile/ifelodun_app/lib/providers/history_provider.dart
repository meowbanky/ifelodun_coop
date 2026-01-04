// providers/history_provider.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/history_summary.dart';

class HistoryProvider with ChangeNotifier {
  List<HistorySummary> _summaries = [];
  bool _loading = false;
  String? _error;
  String? _memberName;
  String? _memberNumber;

  List<HistorySummary> get summaries => _summaries;
  bool get loading => _loading;
  String? get error => _error;
  String? get memberName => _memberName;
  String? get memberNumber => _memberNumber;

  Future<void> fetchHistory(
      String memberId, String token, int fromId, int toId) async {
    _loading = true;
    _error = null;
    _memberName = null;
    _memberNumber = null;
    notifyListeners();

    try {
      final url = Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/history?from=$fromId&to=$toId');
      final res = await http.get(
        url,
        headers: {'Authorization': 'Bearer $token'},
      );
      print("Fecthing response : ${res.body}");

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['data'] != null && data['data'] is List) {
          final rawList = (data['data'] as List)
              .map((item) => HistorySummary.fromJson(item as Map<String, dynamic>))
              .toList();

          _summaries = List<HistorySummary>.generate(
            rawList.length,
            (index) {
              final current = rawList[index];
              return HistorySummary(
                serialNumber: index + 1,
                memberNumber: current.memberNumber,
                firstName: current.firstName,
                lastName: current.lastName,
                periodName: current.periodName,
                shares: current.shares,
                sharesBalance: current.sharesBalance,
                savings: current.savings,
                savingsBalance: current.savingsBalance,
                loan: current.loan,
                loanRepayment: current.loanRepayment,
                loanBalance: current.loanBalance,
                interestCharged: current.interestCharged,
                interestPaid: current.interestPaid,
                unpaidInterest: current.unpaidInterest,
                commodity: current.commodity,
                commodityRepayment: current.commodityRepayment,
                commodityBalance: current.commodityBalance,
                devLevy: current.devLevy,
                stationery: current.stationery,
                entryFees: current.entryFees,
                withdrawals: current.withdrawals,
              );
            },
          );

          if (_summaries.isNotEmpty) {
            final first = _summaries.first;
            _memberName = first.memberName;
            _memberNumber = first.memberNumber;
          } else {
            _memberName = null;
            _memberNumber = null;
          }
        }
      } else {
        _error = 'Error: ${res.body}';
      }
    } catch (e) {
      _error = e.toString();
    }
    _loading = false;
    notifyListeners();
  }
}
