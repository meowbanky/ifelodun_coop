import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../providers/history_provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  int? _periodFromId;
  int? _periodToId;
  List<Map<String, dynamic>> _periods = [];
  bool _periodsLoading = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchPeriods();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchPeriods() async {
    setState(() => _periodsLoading = true);

    try {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');
      final url =
          Uri.parse('http://ifeloduncms.com.ng/mobile_app2/mobile-api/period');
      final res = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _periods = List<Map<String, dynamic>>.from(data['data']);
          _periodsLoading = false;
        });
      } else {
        setState(() => _periodsLoading = false);
        print('Failed to fetch periods: ${res.body}');
      }
    } catch (e) {
      setState(() => _periodsLoading = false);
      print('Error fetching periods: $e');
    }
  }

  Future<void> _getReport() async {
    if (_periodFromId == null || _periodToId == null) return;
    final prefs = await SharedPreferences.getInstance();
    final memberId = prefs.getString('member_id');
    final secureStorage = const FlutterSecureStorage();
    final token = await secureStorage.read(key: 'token');
    if (memberId != null && token != null) {
      print('Fetching history for member: $memberId');
      await Provider.of<HistoryProvider>(context, listen: false).fetchHistory(
        memberId,
        token,
        _periodFromId!,
        _periodToId!,
      );
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOut,
      );
    }
  }

  String _formatNaira(double value) {
    final formatCurrency = NumberFormat.currency(
      locale: 'en_NG',
      symbol: '₦',
      decimalDigits: 2,
    );
    return formatCurrency.format(value);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<HistoryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Transaction Summary"),
      ),
      body: _periodsLoading
          ? const Center(child: CircularProgressIndicator())
          : _periods.isEmpty
              ? const Center(child: Text('No periods available.'))
              : Padding(
                  padding: const EdgeInsets.all(18.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Period From",
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<int>(
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Theme.of(context).colorScheme.surface,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        value: _periodFromId,
                        items: _periods
                            .map((p) => DropdownMenuItem<int>(
                                  value: p['id'],
                                  child: Text(p['name']),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() {
                          _periodFromId = v;
                          // Optionally reset _periodToId if it's before _periodFromId
                          if (_periodToId != null &&
                              (_periodToId ?? 0) < (v ?? 0)) {
                            _periodToId = null;
                          }
                        }),
                      ),
                      const SizedBox(height: 18),
                      const Text("Period To",
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<int>(
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Theme.of(context).colorScheme.surface,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        value: _periodToId,
                        items: _periods
                            .where((p) =>
                                _periodFromId == null ||
                                p['id'] >= _periodFromId!)
                            .map((p) => DropdownMenuItem<int>(
                                  value: p['id'],
                                  child: Text(p['name']),
                                ))
                            .toList(),
                        onChanged: (_periodFromId == null)
                            ? null // disables the dropdown
                            : (v) => setState(() => _periodToId = v),
                        disabledHint: const Text('Select "Period From" first'),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            textStyle: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: provider.loading ? null : _getReport,
                          child: const Text("Get Summary"),
                        ),
                      ),
                      const SizedBox(height: 18),
                      if (provider.loading)
                        const Center(child: CircularProgressIndicator()),
                      if (!provider.loading && provider.summaries.isNotEmpty)
                        Expanded(
                          child: ListView.builder(
                            controller: _scrollController,
                            itemCount: provider.summaries.length,
                            itemBuilder: (context, idx) {
                              final s = provider.summaries[idx];
                              return Card(
                                color: Theme.of(context)
                                    .colorScheme
                                    .primaryContainer,
                                elevation: 2,
                                margin: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "Period: ${s.periodName}",
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                                fontWeight: FontWeight.bold),
                                      ),
                                      const Divider(),
                                      _historyRow(
                                          "Dev Levy", _formatNaira(s.devLevy)),
                                      _historyRow("Stationery",
                                          _formatNaira(s.stationery)),
                                      _historyRow(
                                          "Savings", _formatNaira(s.savings)),
                                      _historyRow("Savings Balance",
                                          _formatNaira(s.savingsBalance)),
                                      _historyRow(
                                          "Shares", _formatNaira(s.shares)),
                                      _historyRow("Shares Balance",
                                          _formatNaira(s.sharesBalance)),
                                      _historyRow("Interest Paid",
                                          _formatNaira(s.interestPaid)),
                                      _historyRow("Commodity",
                                          _formatNaira(s.commodity)),
                                      _historyRow("Commodity Repayment",
                                          _formatNaira(s.commodityRepayment)),
                                      _historyRow("Commodity Balance",
                                          _formatNaira(s.commodityBalance)),
                                      _historyRow("Loan", _formatNaira(s.loan)),
                                      _historyRow("Loan Repayment",
                                          _formatNaira(s.loanRepayment)),
                                      _historyRow("Loan Balance",
                                          _formatNaira(s.loanBalance)),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      if (!provider.loading && provider.summaries.isEmpty)
                        const Center(child: Text('No summary to show.')),
                    ],
                  ),
                ),
    );
  }

  Widget _historyRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 15)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
