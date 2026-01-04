import 'package:flutter/material.dart';

import '../utils/amortization.dart';
import '../widgets/app_text_field.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import 'package:printing/printing.dart';
import 'package:ifelodun_app/services/pdf_service.dart';
import '../models/history_summary.dart';

class AmortizationScreen extends StatefulWidget {
  const AmortizationScreen({super.key});

  @override
  State<AmortizationScreen> createState() => _AmortizationScreenState();
}

class _AmortizationScreenState extends State<AmortizationScreen> {
  final _principalCtrl = TextEditingController();
  final _rateCtrl = TextEditingController();
  final _monthsCtrl = TextEditingController();

  List<AmortizationRow> _rows = [];

  @override
  void dispose() {
    _principalCtrl.dispose();
    _rateCtrl.dispose();
    _monthsCtrl.dispose();
    super.dispose();
  }

  void _generate() {
    final p = double.tryParse(_principalCtrl.text.trim()) ?? 0;
    final r = double.tryParse(_rateCtrl.text.trim()) ?? 0;
    final m = int.tryParse(_monthsCtrl.text.trim()) ?? 0;
    if (p <= 0 || r < 0 || m <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter valid principal, rate, and months')),
      );
      return;
    }
    final rows = AmortizationCalculator.calculate(
      principal: p,
      annualRatePercent: r,
      months: m,
    );
    setState(() => _rows = rows);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Amortization')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        controller: _principalCtrl,
                        label: 'Principal',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        controller: _rateCtrl,
                        label: 'Annual Rate %',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        controller: _monthsCtrl,
                        label: 'Months',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                AppButton(
                  onPressed: _generate,
                  leadingIcon: Icons.calculate,
                  child: const Text('Generate Schedule'),
                )
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_rows.isNotEmpty)
            AppCard(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columns: const [
                    DataColumn(label: Text('#')),
                    DataColumn(label: Text('Payment')),
                    DataColumn(label: Text('Principal')),
                    DataColumn(label: Text('Interest')),
                    DataColumn(label: Text('Balance')),
                  ],
                  rows: _rows
                      .map(
                        (r) => DataRow(
                          cells: [
                            DataCell(Text(r.period.toString())),
                            DataCell(Text(r.payment.toStringAsFixed(2))),
                            DataCell(Text(r.principal.toStringAsFixed(2))),
                            DataCell(Text(r.interest.toStringAsFixed(2))),
                            DataCell(Text(r.balance.toStringAsFixed(2))),
                          ],
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
          if (_rows.isNotEmpty) ...[
            const SizedBox(height: 12),
            AppButton(
              onPressed: () async {
                // Reuse statement PDF format with a synthetic summary from amortization rows
                final synthetic = _rows
                    .asMap()
                    .entries
                    .map(
                      (entry) => HistorySummary(
                        serialNumber: entry.key + 1,
                        memberNumber: '',
                        firstName: '',
                        lastName: '',
                        periodName: '#${entry.value.period}',
                        shares: 0,
                        sharesBalance: 0,
                        savings: 0,
                        savingsBalance: 0,
                        loan: entry.value.payment,
                        loanRepayment: entry.value.principal,
                        loanBalance: entry.value.balance,
                        interestCharged: 0,
                        interestPaid: entry.value.interest,
                        unpaidInterest: 0,
                        commodity: 0,
                        commodityRepayment: 0,
                        commodityBalance: 0,
                        devLevy: 0,
                        stationery: 0,
                        entryFees: 0,
                        withdrawals: 0,
                      ),
                    )
                    .toList();
                final pdf = await PdfService.buildStatement(
                  memberName: 'Member',
                  memberNumber: '',
                  summaries: synthetic,
                  periodRange: 'Amortization Schedule',
                );
                await Printing.sharePdf(
                  bytes: pdf,
                  filename: 'ifelodun_amortization.pdf',
                );
              },
              leadingIcon: Icons.picture_as_pdf,
              child: const Text('Export PDF'),
            ),
          ]
        ],
      ),
    );
  }
}


