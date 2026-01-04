import 'package:http/http.dart' as http;
import 'dart:convert';

void main() async {
  await testApiEndpoints();
}

Future<void> testApiEndpoints() async {
  print('🧪 Starting API Endpoint Discovery...\n');

  // Test different possible base URLs
  final baseUrls = [
    'http://ifeloduncms.com.ng/mobile_app',
    'http://ifeloduncms.com.ng/mobile_app/api',
    'https://ifeloduncms.com.ng/mobile_app',
    'https://ifeloduncms.com.ng/mobile_app/api',
  ];

  for (String baseUrl in baseUrls) {
    print('🔍 Testing base URL: $baseUrl');
    await testLogin(baseUrl);
    await testServerHealth(baseUrl);
    print('');
  }

  print('\n✅ API Discovery completed!');
}

Future<void> testLogin(String baseUrl) async {
  print('🔐 Testing Login Endpoint...');

  // Try different login endpoint patterns
  final loginEndpoints = [
    '/login',
    '/auth/login',
    '/api/auth/login',
  ];

  for (String endpoint in loginEndpoints) {
    try {
      final url = '$baseUrl$endpoint';
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(
            {'identifier': 'test_user', 'password': 'test_password'}),
      );

      print('📍 URL: $url');
      print('📊 Status: ${response.statusCode}');
      print('📄 Response: ${response.body}');

      if (response.statusCode == 200) {
        print('✅ Login endpoint is working!');
        break; // Found working endpoint
      } else {
        print('❌ Login endpoint returned error: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Login test failed: $e');
    }
  }
  print('');
}

Future<void> testServerHealth(String baseUrl) async {
  print('🏥 Testing Server Health...');

  try {
    final response = await http.get(
      Uri.parse('$baseUrl/period'), // Simple endpoint to test
      headers: {'Accept': 'application/json'},
    );

    print('📍 URL: $baseUrl/period');
    print('📊 Status: ${response.statusCode}');
    print('📄 Response: ${response.body}');

    if (response.statusCode == 200 || response.statusCode == 401) {
      print('✅ Server is responding!');
    } else {
      print('❌ Server health check failed: ${response.statusCode}');
    }
  } catch (e) {
    print('❌ Server health test failed: $e');
  }
  print('');
}
