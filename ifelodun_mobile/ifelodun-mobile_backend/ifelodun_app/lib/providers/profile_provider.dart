import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/profile_model.dart';

class ProfileProvider extends ChangeNotifier {
  MemberProfile? profile;
  bool loading = false;
  String? error;
  bool updating = false;

  // Fetch the current profile from backend
  Future<void> fetchProfile() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      final storage = const FlutterSecureStorage();
      final prefs = await SharedPreferences.getInstance();
      final token = await storage.read(key: 'token');
      final memberId = prefs.getString('member_id');
      if (memberId == null || token == null) {
        error = "No member or token found";
        loading = false;
        notifyListeners();
        return;
      }

      final url = Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/profile/$memberId');
      final res = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (res.statusCode == 200) {
        profile = MemberProfile.fromJson(jsonDecode(res.body));
      } else {
        error = "Failed to fetch profile: ${res.body}";
      }
    } catch (e) {
      error = e.toString();
    }
    loading = false;
    notifyListeners();
  }

  // Update the member's profile (including next of kin)
  Future<bool> updateProfile(MemberProfile newProfile) async {
    updating = true;
    error = null;
    notifyListeners();

    try {
      final storage = const FlutterSecureStorage();
      final prefs = await SharedPreferences.getInstance();
      final token = await storage.read(key: 'token');
      final memberId = prefs.getString('member_id');
      if (memberId == null || token == null) {
        error = "No member or token found";
        updating = false;
        notifyListeners();
        return false;
      }

      final url = Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/profile/$memberId');
      final res = await http.put(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'first_name': newProfile.firstName,
          'last_name': newProfile.lastName,
          'middle_name': newProfile.middleName,
          'phone_number': newProfile.phoneNumber,
          'email': newProfile.email,
          'address': newProfile.address,
          'date_of_birth': newProfile.dateOfBirth,
          'gender': newProfile.gender,
          'employment_status': newProfile.employmentStatus,
          'next_of_kin': newProfile.nextOfKin?.toJson(), // null-safe
        }),
      );

      if (res.statusCode == 200) {
        // Option 1: refetch profile from backend (recommended)
        await fetchProfile();
        updating = false;
        notifyListeners();
        return true;
      } else {
        error = "Update failed: ${res.body}";
      }
    } catch (e) {
      error = e.toString();
    }
    updating = false;
    notifyListeners();
    return false;
  }
}
