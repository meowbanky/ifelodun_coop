import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class ActionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const ActionItem({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 30, color: AppColors.accent),
          const SizedBox(height: 5),
          Text(label, style: TextStyle(color: AppColors.textDark)),
        ],
      ),
    );
  }
}
