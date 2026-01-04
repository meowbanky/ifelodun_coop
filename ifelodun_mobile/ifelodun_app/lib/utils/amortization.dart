class AmortizationRow {
  final int period;
  final double payment;
  final double principal;
  final double interest;
  final double balance;

  AmortizationRow({
    required this.period,
    required this.payment,
    required this.principal,
    required this.interest,
    required this.balance,
  });
}

class AmortizationCalculator {
  static List<AmortizationRow> calculate({
    required double principal,
    required double annualRatePercent,
    required int months,
  }) {
    final monthlyRate = annualRatePercent / 100.0 / 12.0;
    final payment = monthlyRate == 0
        ? principal / months
        : principal * (monthlyRate * _pow1p(monthlyRate, months)) /
            (_pow1p(monthlyRate, months) - 1);

    final rows = <AmortizationRow>[];
    double balance = principal;
    for (int i = 1; i <= months; i++) {
      final interest = balance * monthlyRate;
      final principalPaid = ((payment - interest).clamp(0, balance)).toDouble();
      balance = (balance - principalPaid);
      if (balance < 1e-6) balance = 0;
      rows.add(AmortizationRow(
        period: i,
        payment: payment,
        principal: principalPaid,
        interest: interest,
        balance: balance,
      ));
    }
    return rows;
  }

  static double _pow1p(double r, int n) {
    // (1 + r)^n
    return List<double>.filled(n, 0)
        .fold<double>(1.0, (v, _) => v * (1.0 + r));
  }
}

