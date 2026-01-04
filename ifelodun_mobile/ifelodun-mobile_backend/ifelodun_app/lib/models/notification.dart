class AppNotification {
  final int id;
  final String title;
  final String body;
  final DateTime date;
  final bool read;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.date,
    this.read = false,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      date: DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
      read: json['read'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'date': date.toIso8601String(),
        'read': read,
      };
}
