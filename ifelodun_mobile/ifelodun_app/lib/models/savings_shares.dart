class SavingsShares {
  final double savings;
  final double shares;

  SavingsShares({required this.savings, required this.shares});

  factory SavingsShares.fromJson(Map<String, dynamic> json) {
    return SavingsShares(
      savings: double.parse(json['savings']?.toString() ?? '0.0'),
      shares: double.parse(json['shares']?.toString() ?? '0.0'),
    );
  }
}
