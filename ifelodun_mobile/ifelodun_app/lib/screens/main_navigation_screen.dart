import 'package:flutter/material.dart';
import '../screens/home_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/loan_saving_screen.dart';
import '../screens/change_password_screen.dart';
import '../screens/history_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen>
    with TickerProviderStateMixin {
  int _selectedIndex = 0;
  final List<Widget?> _screens = List.filled(5, null);
  final PageController _pageController = PageController();

  final List<BottomNavigationBarItem> _navItems = const [
    BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
    BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
    BottomNavigationBarItem(
        icon: Icon(Icons.account_balance_wallet), label: 'Loan/Saving'),
    BottomNavigationBarItem(icon: Icon(Icons.lock), label: 'Change Password'),
  ];

  @override
  void initState() {
    super.initState();
    _screens[0] = const HomeScreen();
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
      if (_screens[index] == null) {
        _screens[index] = _buildScreen(index);
      }
    });
    _pageController.jumpToPage(index);
  }

  Widget _buildScreen(int index) {
    switch (index) {
      case 0:
        return const HomeScreen();
      case 1:
        return const HistoryScreen();
      case 2:
        return const ProfileScreen();
      case 3:
        return const SavingsWithLoanScreen();
      case 4:
        return const ChangePasswordScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Scaffold(
      body: PageView.builder(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _screens.length,
        itemBuilder: (_, index) =>
            _screens[index] ?? const Center(child: CircularProgressIndicator()),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        items: _navItems,
        onTap: _onItemTapped,
        selectedItemColor: colorScheme.primary,
        unselectedItemColor: theme.brightness == Brightness.dark
            ? Colors.white60
            : colorScheme.onSurface.withOpacity(0.6),
        type: BottomNavigationBarType.fixed,
        backgroundColor: colorScheme.surface,
        selectedIconTheme: const IconThemeData(size: 28),
        unselectedIconTheme: const IconThemeData(size: 24),
        showUnselectedLabels: true,
      ),
    );
  }
}
