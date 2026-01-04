import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class UpdateService {
  Future<void> checkAndPrompt(BuildContext context) async {
    try {
      final info = await PackageInfo.fromPlatform();
      final currentVersion = info.version; // e.g. 1.0.0

      final resp = await http.get(Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/app_version.php'));
      if (resp.statusCode != 200) return;
      final data = jsonDecode(resp.body);
      final payload =
          (data is Map && data['data'] != null) ? data['data'] : data;

      final latest = (payload['version'] ?? '').toString();
      final minVersion = (payload['min_version'] ?? '').toString();
      final url = (payload['url'] ?? '').toString();
      final notes = (payload['notes'] ?? '').toString();

      if (latest.isEmpty || url.isEmpty) return;

      final needsForce = _isVersionLower(currentVersion, minVersion);
      final isOutdated = _isVersionLower(currentVersion, latest);
      if (!isOutdated) return;

      if (!context.mounted) return;
      await showDialog(
        context: context,
        barrierDismissible: !needsForce,
        builder: (ctx) => AlertDialog(
          title: const Text('Update available'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Current: $currentVersion  →  Latest: $latest'),
              const SizedBox(height: 8),
              if (notes.isNotEmpty) Text(notes),
            ],
          ),
          actions: [
            if (!needsForce)
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Later'),
              ),
            FilledButton(
              onPressed: () async {
                final uri = Uri.parse(url);
                await launchUrl(uri, mode: LaunchMode.externalApplication);
                if (!needsForce && ctx.mounted) Navigator.of(ctx).pop();
              },
              child: const Text('Update'),
            ),
          ],
        ),
      );
    } catch (_) {
      // Silent fail
    }
  }

  bool _isVersionLower(String a, String b) {
    if (a.isEmpty || b.isEmpty) return false;
    List<int> pa = a.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    List<int> pb = b.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    while (pa.length < 3) pa.add(0);
    while (pb.length < 3) pb.add(0);
    for (int i = 0; i < 3; i++) {
      if (pa[i] < pb[i]) return true;
      if (pa[i] > pb[i]) return false;
    }
    return false;
  }
}
