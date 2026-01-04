class NextOfKin {
  final int? id;
  final String firstName;
  final String lastName;
  final String relationship;
  final String phoneNumber;
  final String address;

  NextOfKin({
    this.id,
    required this.firstName,
    required this.lastName,
    required this.relationship,
    required this.phoneNumber,
    required this.address,
  });

  factory NextOfKin.fromJson(Map<String, dynamic>? json) {
    if (json == null)
      return NextOfKin(
        id: null,
        firstName: '',
        lastName: '',
        relationship: '',
        phoneNumber: '',
        address: '',
      );
    return NextOfKin(
      id: json['id'],
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      relationship: json['relationship'] ?? '',
      phoneNumber: json['phone_number'] ?? '',
      address: json['address'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'first_name': firstName,
        'last_name': lastName,
        'relationship': relationship,
        'phone_number': phoneNumber,
        'address': address,
      };
}

class MemberProfile {
  final int id;
  final String memberId;
  final String firstName;
  final String lastName;
  final String middleName;
  final String phoneNumber;
  final String email;
  final String address;
  final String dateOfBirth;
  final String gender;
  final String employmentStatus;
  final NextOfKin? nextOfKin;

  MemberProfile({
    required this.id,
    required this.memberId,
    required this.firstName,
    required this.lastName,
    required this.middleName,
    required this.phoneNumber,
    required this.email,
    required this.address,
    required this.dateOfBirth,
    required this.gender,
    required this.employmentStatus,
    this.nextOfKin,
  });

  factory MemberProfile.fromJson(Map<String, dynamic> json) {
    return MemberProfile(
      id: json['id'] ?? 0,
      memberId: json['member_id'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      middleName: json['middle_name'] ?? '',
      phoneNumber: json['phone_number'] ?? '',
      email: json['email'] ?? '',
      address: json['address'] ?? '',
      dateOfBirth: json['date_of_birth'] ?? '',
      gender: json['gender'] ?? '',
      employmentStatus: json['employment_status'] ?? '',
      nextOfKin: json['next_of_kin'] != null
          ? NextOfKin.fromJson(json['next_of_kin'])
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'member_id': memberId,
        'first_name': firstName,
        'last_name': lastName,
        'middle_name': middleName,
        'phone_number': phoneNumber,
        'email': email,
        'address': address,
        'date_of_birth': dateOfBirth,
        'gender': gender,
        'employment_status': employmentStatus,
        'next_of_kin': nextOfKin?.toJson(),
      };
}
