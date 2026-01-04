import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/dashboard_provider.dart';
import '../models/dashboard_summary.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'notifications_screen.dart';
import '../providers/auth_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? _userName;

  @override
  void initState() {
    super.initState();
    _loadUserName();
    _fetchAndLoadSummary();
  }

  Future<void> _loadUserName() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userName = prefs.getString('user_name');
    });
  }

  Future<void> _fetchAndLoadSummary() async {
    final prefs = await SharedPreferences.getInstance();
    final secureStorage = const FlutterSecureStorage();
    final memberId = prefs.getString('member_id');
    final token = await secureStorage.read(key: 'token');
    if (memberId != null && token != null) {
      await Provider.of<DashboardProvider>(context, listen: false)
          .fetchSummary(memberId, token);
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  }

  @override
  Widget build(BuildContext context) {
    // Pull theme data for color logic
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Consumer<DashboardProvider>(
      builder: (context, provider, _) {
        if (provider.loading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (provider.error != null) {
          return Center(child: Text(provider.error!));
        }
        final summary = provider.summary;
        if (summary == null) {
          return const Center(child: Text('No summary found.'));
        }

        return SafeArea(
          child: Scaffold(
            backgroundColor: colorScheme.background,
            appBar: AppBar(
              backgroundColor: colorScheme.background,
              elevation: 0,
              automaticallyImplyLeading: false,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _userName != null && _userName!.isNotEmpty
                        ? "Welcome, $_userName!"
                        : "Welcome!",
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: colorScheme.onBackground,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    _greeting(),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onBackground.withOpacity(0.7),
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: Icon(Icons.notifications,
                      color: isDark ? colorScheme.primary : Colors.deepOrange,
                      size: 28),
                  tooltip: 'Notifications',
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const NotificationScreen(),
                      ),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.logout, color: Colors.red),
                  tooltip: 'Logout',
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Confirm Logout'),
                        content: const Text('Are you sure you want to logout?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            child: const Text('Cancel'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(true),
                            child: const Text('Logout'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      await Provider.of<AuthProvider>(context, listen: false)
                          .logout();
                      if (mounted) {
                        Navigator.of(context).pushNamedAndRemoveUntil(
                            '/login', (route) => false);
                      }
                    }
                  },
                ),
                const SizedBox(width: 10),
              ],
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Cards - vertical layout
                  _DashboardCard(
                    label: 'Shares + Savings',
                    value: summary.totalSharesSavings,
                    icon: Icons.savings,
                    gradient: _cardGradient(isDark, Colors.green, Colors.teal),
                    textColor: colorScheme.onPrimary,
                  ),
                  _DashboardCard(
                    label: 'Loan Balance',
                    value: summary.loanBalance,
                    icon: Icons.account_balance_wallet,
                    gradient:
                        _cardGradient(isDark, Colors.orange, Colors.yellow),
                    textColor: colorScheme.onPrimary,
                  ),
                  _DashboardCard(
                    label: 'Unpaid Interest',
                    value: summary.unpaidInterest,
                    icon: Icons.trending_up,
                    gradient: _cardGradient(isDark, Colors.red, Colors.pink),
                    textColor: colorScheme.onPrimary,
                  ),
                  _DashboardCard(
                    label: 'Total Loan',
                    value: summary.totalLoan,
                    icon: Icons.show_chart,
                    gradient: _cardGradient(isDark, Colors.blue, Colors.indigo),
                    textColor: colorScheme.onPrimary,
                  ),
                  const SizedBox(height: 22),
                  // Infographic (Pie Chart)
                  Card(
                    color: colorScheme.surface,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: _SummaryPieChart(summary: summary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // This method adapts the gradient for dark/light theme
  Gradient _cardGradient(bool isDark, Color color1, Color color2) {
    if (isDark) {
      return LinearGradient(
        colors: [
          color1 is MaterialColor ? color1[800]! : color1.withOpacity(0.85),
          color2 is MaterialColor ? color2[800]! : color2.withOpacity(0.85),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }
    return LinearGradient(
      colors: [
        color1 is MaterialColor ? color1[400]! : color1.withOpacity(0.8),
        color2 is MaterialColor ? color2[200]! : color2.withOpacity(0.6),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final String label;
  final double value;
  final IconData icon;
  final Gradient gradient;
  final Color textColor;

  const _DashboardCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    required this.textColor,
  });

  String _formatNaira(double value) {
    final formatCurrency = NumberFormat.currency(
      locale: 'en_NG',
      symbol: '₦',
      decimalDigits: 2,
    );
    return formatCurrency.format(value);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 100, maxHeight: 130),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: textColor.withOpacity(0.10),
            blurRadius: 16,
            spreadRadius: 2,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              CircleAvatar(
                backgroundColor: textColor.withOpacity(0.17),
                radius: 27,
                child: Icon(icon, color: textColor, size: 28),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _formatNaira(value),
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 23,
                        shadows: const [
                          Shadow(
                            color: Colors.black12,
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryPieChart extends StatelessWidget {
  final DashboardSummary summary;

  const _SummaryPieChart({required this.summary});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    final total = summary.totalSharesSavings +
        summary.loanBalance +
        summary.unpaidInterest +
        summary.totalLoan;
    final showChart = total > 0;

    final sections = [
      PieChartSectionData(
        value: summary.totalSharesSavings,
        title: "Shares\n+Savings",
        radius: 44,
        color: isDark ? Colors.green[700] : Colors.green[400],
        titleStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: colorScheme.onSurface,
        ),
      ),
      PieChartSectionData(
        value: summary.loanBalance,
        title: "Loan\nBal",
        radius: 41,
        color: isDark ? Colors.orange[700] : Colors.orange[400],
        titleStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: colorScheme.onSurface,
        ),
      ),
      PieChartSectionData(
        value: summary.unpaidInterest,
        title: "Unpaid\nInterest",
        radius: 38,
        color: isDark ? Colors.red[700] : Colors.red[400],
        titleStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: colorScheme.onSurface,
        ),
      ),
      PieChartSectionData(
        value: summary.totalLoan,
        title: "Total\nLoan",
        radius: 36,
        color: isDark ? Colors.blue[700] : Colors.blue[400],
        titleStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: colorScheme.onSurface,
        ),
      ),
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Financial Breakdown",
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 170,
          child: showChart
              ? PieChart(
                  PieChartData(
                    centerSpaceRadius: 30,
                    sectionsSpace: 2,
                    sections:
                        sections.where((s) => s.value > 0).toList().isEmpty
                            ? [
                                PieChartSectionData(
                                  value: 1,
                                  color: Colors.grey[400],
                                  title: "No Data",
                                  radius: 36,
                                  titleStyle: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: colorScheme.onSurface,
                                  ),
                                )
                              ]
                            : sections,
                  ),
                )
              : const Center(
                  child: Text(
                    "No data for infographic",
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ),
        ),
      ],
    );
  }
}
