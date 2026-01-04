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
    // Handle both 'read' (bool) and 'is_read' (int 0/1) from backend
    bool isRead = false;
    if (json.containsKey('read')) {
      isRead = json['read'] == true || json['read'] == 1;
    } else if (json.containsKey('is_read')) {
      isRead = json['is_read'] == 1 || json['is_read'] == true;
    }
    
    return AppNotification(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      date: DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
      read: isRead,
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
