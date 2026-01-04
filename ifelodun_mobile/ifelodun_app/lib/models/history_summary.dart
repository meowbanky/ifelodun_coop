class HistorySummary {
  final int serialNumber;
  final String memberNumber;
  final String firstName;
  final String lastName;
  final String periodName;
  final double shares;
  final double sharesBalance;
  final double savings;
  final double savingsBalance;
  final double loan;
  final double loanRepayment;
  final double loanBalance;
  final double interestCharged;
  final double interestPaid;
  final double unpaidInterest;
  final double commodity;
  final double commodityRepayment;
  final double commodityBalance;
  final double devLevy;
  final double stationery;
  final double entryFees;
  final double withdrawals;

  HistorySummary({
    required this.serialNumber,
    required this.memberNumber,
    required this.firstName,
    required this.lastName,
    required this.periodName,
    required this.shares,
    required this.sharesBalance,
    required this.savings,
    required this.savingsBalance,
    required this.loan,
    required this.loanRepayment,
    required this.loanBalance,
    required this.interestCharged,
    required this.interestPaid,
    required this.unpaidInterest,
    required this.commodity,
    required this.commodityRepayment,
    required this.commodityBalance,
    required this.devLevy,
    required this.stationery,
    required this.entryFees,
    required this.withdrawals,
  });

  String get memberName =>
      [firstName, lastName].where((part) => part.isNotEmpty).join(' ').trim();

  double get rowTotal =>
      shares +
      savings +
      loanRepayment +
      interestPaid +
      commodityRepayment +
      devLevy +
      stationery +
      entryFees -
      withdrawals;

  // Helper to safely parse strings/numbers to double
  static double parseDouble(dynamic value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  factory HistorySummary.fromJson(Map<String, dynamic> json) {
    return HistorySummary(
      serialNumber: json['serial'] != null
          ? int.tryParse(json['serial'].toString()) ?? 0
          : 0,
      memberNumber: json['member_id']?.toString() ?? '',
      firstName: json['first_name']?.toString() ?? '',
      lastName: json['last_name']?.toString() ?? '',
      periodName: json['period_name']?.toString() ?? '',
      shares: parseDouble(json['shares_amount']),
      sharesBalance: parseDouble(json['shares_balance']),
      savings: parseDouble(json['savings_amount']),
      savingsBalance: parseDouble(json['savings_balance']),
      loan: parseDouble(json['loan_amount']),
      loanRepayment: parseDouble(json['loan_repayment']),
      loanBalance: parseDouble(json['loan_balance']),
      interestCharged: parseDouble(json['interest_charged']),
      interestPaid: parseDouble(json['interest_paid']),
      unpaidInterest: parseDouble(json['unpaid_interest']),
      commodity: parseDouble(json['commodity_amount']),
      commodityRepayment: parseDouble(json['commodity_repayment']),
      commodityBalance: parseDouble(json['commodity_balance']),
      devLevy: parseDouble(json['dev_levy']),
      stationery: parseDouble(json['stationery']),
      entryFees: parseDouble(json['entry_fees']),
      withdrawals: parseDouble(
        json['withdrawal'] ??
            json['withdrawals'] ??
            json['withdrawal_amount'],
      ),
    );
  }
}
