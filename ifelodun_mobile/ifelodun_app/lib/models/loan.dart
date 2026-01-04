class Loan {
  final double remainingBalance;

  Loan({required this.remainingBalance});

  factory Loan.fromJson(Map<String, dynamic> json) {
    return Loan(
      remainingBalance:
          double.parse(json['remainingBalance']?.toString() ?? '0.0'),
    );
  }
}
