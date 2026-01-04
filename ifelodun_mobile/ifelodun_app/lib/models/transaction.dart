class Transaction {
  final String type;
  final double amount;
  final String date;

  Transaction({
    required this.type,
    required this.amount,
    required this.date,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      type: json['type'] ?? 'Unknown',
      amount: double.parse(json['amount']?.toString() ?? '0.0'),
      date: json['date'] ?? 'N/A',
    );
  }
}
