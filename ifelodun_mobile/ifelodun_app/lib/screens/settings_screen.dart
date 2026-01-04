import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Settings', style: TextStyle(color: AppColors.textDark)),
        backgroundColor: AppColors.primary,
      ),
      body: Center(
          child: Text('Settings Screen',
              style: TextStyle(color: AppColors.textDark))),
    );
  }
}
