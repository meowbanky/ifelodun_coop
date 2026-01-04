import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:ifelodun_app/services/pdf_service.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../providers/history_provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import 'amortization_screen.dart';

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

  String get _selectedPeriodLabel {
    if (_periodFromId == null || _periodToId == null) return '';
    final from = _periods.firstWhere(
      (p) => p['id'] == _periodFromId,
      orElse: () => {},
    );
    final to = _periods.firstWhere(
      (p) => p['id'] == _periodToId,
      orElse: () => {},
    );
    final fromName = from['name']?.toString();
    final toName = to['name']?.toString();
    if ((fromName ?? '').isEmpty || (toName ?? '').isEmpty) {
      return '';
    }
    if (fromName == toName) return fromName!;
    return '$fromName - $toName';
  }

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
        actions: [
          IconButton(
            tooltip: 'Amortization',
            icon: const Icon(Icons.calculate),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const AmortizationScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: _periodsLoading
          ? const Center(child: CircularProgressIndicator())
          : _periods.isEmpty
              ? const Center(child: Text('No periods available.'))
              : Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Filters card
                      AppCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Filter by period',
                                style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 10),
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final isNarrow = constraints.maxWidth < 380;
                                // Base (non-expanded) field groups
                                final fromField = Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Period From",
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 6),
                                    DropdownButtonFormField<int>(
                                      isDense: true,
                                      value: _periodFromId,
                                      decoration: const InputDecoration(
                                          hintText: 'Select start period'),
                                      items: _periods
                                          .map((p) => DropdownMenuItem<int>(
                                                value: p['id'],
                                                child: Text(p['name'],
                                                    overflow:
                                                        TextOverflow.ellipsis),
                                              ))
                                          .toList(),
                                      onChanged: (v) => setState(() {
                                        _periodFromId = v;
                                        if (_periodToId != null &&
                                            (_periodToId ?? 0) < (v ?? 0)) {
                                          _periodToId = null;
                                        }
                                      }),
                                    ),
                                  ],
                                );
                                final toField = Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Period To",
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 6),
                                    DropdownButtonFormField<int>(
                                      isDense: true,
                                      value: _periodToId,
                                      decoration: const InputDecoration(
                                          hintText: 'Select end period'),
                                      items: _periods
                                          .where((p) =>
                                              _periodFromId == null ||
                                              p['id'] >= _periodFromId!)
                                          .map((p) => DropdownMenuItem<int>(
                                                value: p['id'],
                                                child: Text(p['name'],
                                                    overflow:
                                                        TextOverflow.ellipsis),
                                              ))
                                          .toList(),
                                      onChanged: (_periodFromId == null)
                                          ? null
                                          : (v) =>
                                              setState(() => _periodToId = v),
                                    ),
                                  ],
                                );

                                if (isNarrow) {
                                  return Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      fromField,
                                      const SizedBox(height: 12),
                                      toField,
                                    ],
                                  );
                                }
                                return Row(
                                  children: [
                                    Expanded(child: fromField),
                                    const SizedBox(width: 12),
                                    Expanded(child: toField),
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 12),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: AppButton(
                              onPressed: provider.loading ? null : _getReport,
                              leadingIcon: Icons.search,
                              child: const Text('Get Summary'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: AppButton(
                              onPressed: provider.summaries.isEmpty
                                  ? null
                                  : () async {
                                      try {
                                        final pdf =
                                            await PdfService.buildStatement(
                                          memberName:
                                              provider.memberName ?? 'Member',
                                          memberNumber:
                                              provider.memberNumber ?? '',
                                          summaries: provider.summaries,
                                          periodRange: _selectedPeriodLabel,
                                        );
                                        await Printing.sharePdf(
                                          bytes: pdf,
                                          filename: 'ifelodun_statement.pdf',
                                        );
                                      } catch (_) {}
                                    },
                              leadingIcon: Icons.picture_as_pdf,
                              child: const Text('Export PDF'),
                            ),
                          ),
                        ],
                      ),
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
