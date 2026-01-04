class Member {
  final String firstName;
  final String lastName;
  final String phoneNumber;

  Member({
    required this.firstName,
    required this.lastName,
    required this.phoneNumber,
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      firstName: json['firstName'] ?? 'Unknown',
      lastName: json['lastName'] ?? '',
      phoneNumber: json['phoneNumber'] ?? 'N/A',
    );
  }
}
