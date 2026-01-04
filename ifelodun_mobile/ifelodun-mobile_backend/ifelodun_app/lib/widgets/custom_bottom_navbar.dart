import 'package:flutter/material.dart';

class CustomBottomNavBar extends StatefulWidget {
  const CustomBottomNavBar({super.key});

  @override
  State<CustomBottomNavBar> createState() => _CustomBottomNavBarState();
}

class _CustomBottomNavBarState extends State<CustomBottomNavBar> {
  int _currentIndex = 0;
  final List<_NavBarItem> _items = [
    _NavBarItem(Icons.home_outlined, "Home"),
    _NavBarItem(Icons.person_outline, "Profile"),
    _NavBarItem(Icons.history, "History"),
    _NavBarItem(Icons.savings_outlined, "Loan/Saving"),
    _NavBarItem(Icons.lock_outline, "Password"),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 70,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(.08),
            blurRadius: 8,
            offset: const Offset(0, -2),
          )
        ],
        borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(22), topRight: Radius.circular(22)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(_items.length, (index) {
          final item = _items[index];
          final selected = index == _currentIndex;
          return InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () {
              setState(() => _currentIndex = index);
              // TODO: Implement navigation
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 190),
              padding: EdgeInsets.symmetric(
                  horizontal: selected ? 16 : 0, vertical: 7),
              decoration: selected
                  ? BoxDecoration(
                      color: Colors.indigo[50],
                      borderRadius: BorderRadius.circular(15),
                    )
                  : null,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(item.icon,
                      color: selected ? Colors.indigo[700] : Colors.grey,
                      size: 28),
                  const SizedBox(height: 5),
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight:
                          selected ? FontWeight.bold : FontWeight.normal,
                      color: selected ? Colors.indigo[700] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _NavBarItem {
  final IconData icon;
  final String label;
  _NavBarItem(this.icon, this.label);
}
