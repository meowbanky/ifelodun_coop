class DashboardSummary {
  final double totalSharesSavings;
  final double loanBalance;
  final double unpaidInterest;
  final double totalLoan;

  DashboardSummary({
    required this.totalSharesSavings,
    required this.loanBalance,
    required this.unpaidInterest,
    required this.totalLoan,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    // Safe conversion: int -> double, null -> 0.0
    double safeDouble(dynamic v) {
      if (v == null) return 0.0;
      if (v is int) return v.toDouble();
      if (v is double) return v;
      if (v is String) return double.tryParse(v) ?? 0.0;
      return 0.0;
    }

    return DashboardSummary(
      totalSharesSavings: safeDouble(json['total_share_savings']),
      loanBalance: safeDouble(json['loan_balance']),
      unpaidInterest: safeDouble(json['unpaid_interest']),
      totalLoan: safeDouble(json['total_loan']),
    );
  }
}
