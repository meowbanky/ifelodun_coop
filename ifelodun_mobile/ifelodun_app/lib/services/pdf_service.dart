import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../models/history_summary.dart';

class PdfService {
  static Future<Uint8List> buildStatement({
    required String memberName,
    required String memberNumber,
    required List<HistorySummary> summaries,
    String? periodRange,
  }) async {
    final doc = pw.Document();
    final df = DateFormat('dd MMM yyyy, h:mma');
    final numberFormat = NumberFormat('#,##0.00', 'en_NG');

    String formatValue(double value) => numberFormat.format(value);
    String formatText(String value) => value.isEmpty ? '-' : value;
    String formatPeriod(String value) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return '-';
      try {
        final parsed = DateFormat('MMMM yyyy').parse(trimmed);
        return DateFormat('MMM yyyy').format(parsed);
      } catch (_) {
        return trimmed;
      }
    }

    double sumBy(double Function(HistorySummary s) selector) =>
        summaries.fold<double>(0, (total, item) => total + selector(item));

    double lastValue(double Function(HistorySummary s) selector) =>
        summaries.isNotEmpty ? selector(summaries.last) : 0;

    final totals = {
      'shares': sumBy((s) => s.shares),
      'sharesBalance': lastValue((s) => s.sharesBalance),
      'savings': sumBy((s) => s.savings),
      'savingsBalance': lastValue((s) => s.savingsBalance),
      'loan': sumBy((s) => s.loan),
      'loanRepayment': sumBy((s) => s.loanRepayment),
      'loanBalance': lastValue((s) => s.loanBalance),
      'interestCharged': sumBy((s) => s.interestCharged),
      'interestPaid': sumBy((s) => s.interestPaid),
      'unpaidInterest': lastValue((s) => s.unpaidInterest),
      'commodity': sumBy((s) => s.commodity),
      'commodityRepayment': sumBy((s) => s.commodityRepayment),
      'commodityBalance': lastValue((s) => s.commodityBalance),
      'devLevy': sumBy((s) => s.devLevy),
      'stationery': sumBy((s) => s.stationery),
      'entryFees': sumBy((s) => s.entryFees),
      'withdrawal': sumBy((s) => s.withdrawals),
      'total': sumBy((s) => s.rowTotal),
    };

    final headers = [
      'S/N',
      'Period',
      'Shr Amt',
      'Shr Bal',
      'Sav Amt',
      'Sav Bal',
      'Loan',
      'Loan Rep',
      'Loan Bal',
      'Int Chg',
      'Int Pd',
      'Int Unpd',
      'Com Amt',
      'Com Rep',
      'Com Bal',
      'Dev Levy',
      'Stationery',
      'Entry',
      'Withdrawal',
      'Total',
    ];

    final dataRows = summaries.map((s) {
      final displaySerial =
          s.serialNumber > 0 ? s.serialNumber : (summaries.indexOf(s) + 1);
      return [
        displaySerial.toString(),
        formatPeriod(s.periodName),
        formatValue(s.shares),
        formatValue(s.sharesBalance),
        formatValue(s.savings),
        formatValue(s.savingsBalance),
        formatValue(s.loan),
        formatValue(s.loanRepayment),
        formatValue(s.loanBalance),
        formatValue(s.interestCharged),
        formatValue(s.interestPaid),
        formatValue(s.unpaidInterest),
        formatValue(s.commodity),
        formatValue(s.commodityRepayment),
        formatValue(s.commodityBalance),
        formatValue(s.devLevy),
        formatValue(s.stationery),
        formatValue(s.entryFees),
        formatValue(s.withdrawals),
        formatValue(s.rowTotal),
      ];
    }).toList();

    dataRows.add([
      'Total',
      '',
      formatValue(totals['shares']!),
      formatValue(totals['sharesBalance']!),
      formatValue(totals['savings']!),
      formatValue(totals['savingsBalance']!),
      formatValue(totals['loan']!),
      formatValue(totals['loanRepayment']!),
      formatValue(totals['loanBalance']!),
      formatValue(totals['interestCharged']!),
      formatValue(totals['interestPaid']!),
      formatValue(totals['unpaidInterest']!),
      formatValue(totals['commodity']!),
      formatValue(totals['commodityRepayment']!),
      formatValue(totals['commodityBalance']!),
      formatValue(totals['devLevy']!),
      formatValue(totals['stationery']!),
      formatValue(totals['entryFees']!),
      formatValue(totals['withdrawal']!),
      formatValue(totals['total']!),
    ]);

    doc.addPage(
      pw.MultiPage(
        pageTheme: pw.PageTheme(
          pageFormat: PdfPageFormat.a4.landscape,
          margin: const pw.EdgeInsets.symmetric(horizontal: 24, vertical: 18),
          textDirection: pw.TextDirection.ltr,
        ),
        header: (context) => pw.Column(children: [
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'IFELodun Cooperative Society',
                style: pw.TextStyle(
                  fontSize: 18,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                'Member Financial Statement',
                style: pw.TextStyle(
                  fontSize: 12,
                  color: PdfColors.grey700,
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 8),
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Member Name: ${formatText(memberName)}',
                      style: const pw.TextStyle(fontSize: 11),
                    ),
                    pw.Text(
                      'Member Number: ${formatText(memberNumber)}',
                      style: const pw.TextStyle(fontSize: 11),
                    ),
                    if (periodRange != null && periodRange.trim().isNotEmpty)
                      pw.Text(
                        'Period Covered: ${periodRange.trim()}',
                        style: const pw.TextStyle(fontSize: 11),
                      ),
                  ]),
              pw.Text(
                'Generated: ${df.format(DateTime.now())}',
                style: const pw.TextStyle(fontSize: 10),
              ),
            ],
          ),
        ]),
        footer: (context) => pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text(
            'Page ${context.pageNumber} of ${context.pagesCount}',
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600),
          ),
        ),
        build: (context) => [
          pw.SizedBox(height: 12),
          pw.Table.fromTextArray(
            headers: headers,
            data: dataRows,
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
              fontSize: 8,
            ),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.blueGrey800),
            cellAlignment: pw.Alignment.centerLeft,
            cellStyle: const pw.TextStyle(fontSize: 7.5),
            cellAlignments: {
              0: pw.Alignment.center,
              1: pw.Alignment.centerLeft,
              2: pw.Alignment.centerLeft,
              3: pw.Alignment.centerLeft,
              for (var i = 4; i < headers.length; i++)
                i: pw.Alignment.centerRight,
            },
            columnWidths: {
              0: const pw.FixedColumnWidth(24),
              1: const pw.FixedColumnWidth(80),
              for (var i = 2; i < headers.length; i++)
                i: const pw.FlexColumnWidth(1),
            },
          ),
        ],
      ),
    );

    return doc.save();
  }
}
