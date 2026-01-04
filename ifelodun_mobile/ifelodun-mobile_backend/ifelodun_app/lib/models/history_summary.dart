class HistorySummary {
  final String periodName;
  final double devLevy;
  final double stationery;
  final double savings;
  final double savingsBalance;
  final double shares;
  final double sharesBalance;
  final double interestPaid;
  final double commodity;
  final double commodityRepayment;
  final double commodityBalance;
  final double loan;
  final double loanRepayment;
  final double loanBalance;

  HistorySummary({
    required this.periodName,
    required this.devLevy,
    required this.stationery,
    required this.savings,
    required this.savingsBalance,
    required this.shares,
    required this.sharesBalance,
    required this.interestPaid,
    required this.commodity,
    required this.commodityRepayment,
    required this.commodityBalance,
    required this.loan,
    required this.loanRepayment,
    required this.loanBalance,
  });

  // Helper to safely parse strings/numbers to double
  static double parseDouble(dynamic value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  factory HistorySummary.fromJson(Map<String, dynamic> json) {
    return HistorySummary(
      periodName: json['period_name'] ?? '',
      devLevy: parseDouble(json['dev_levy']),
      stationery: parseDouble(json['stationery']),
      savings: parseDouble(json['savings_amount']),
      savingsBalance: parseDouble(json['savings_balance']),
      shares: parseDouble(json['shares_amount']),
      sharesBalance: parseDouble(json['shares_balance']),
      interestPaid: parseDouble(json['interest_paid']),
      commodity: parseDouble(json['commodity_amount']),
      commodityRepayment: parseDouble(json['commodity_repayment']),
      commodityBalance: parseDouble(json['commodity_balance']),
      loan: parseDouble(json['loan_amount']),
      loanRepayment: parseDouble(json['loan_repayment']),
      loanBalance: parseDouble(json['loan_balance']),
    );
  }
}
