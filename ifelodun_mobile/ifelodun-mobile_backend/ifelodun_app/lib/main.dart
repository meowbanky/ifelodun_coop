import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'routes/app_routes.dart';
import 'theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/member_provider.dart';
import 'providers/notification_provider.dart';
import 'services/notification_service.dart';
import 'providers/dashboard_provider.dart';
import 'providers/history_provider.dart';
import 'providers/loan_saving_provider.dart';
import 'providers/profile_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('Firebase initialized successfully');
  } catch (e) {
    print('Firebase initialization error: $e');
  }

  try {
    await NotificationService().init();
    print('NotificationService initialized');
  } catch (e) {
    print('NotificationService init error: $e');
  }

  final authProvider = AuthProvider();

  try {
    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ChangeNotifierProvider(create: (_) => MemberProvider()),
          ChangeNotifierProvider(create: (_) => NotificationProvider()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
          ChangeNotifierProvider(create: (_) => HistoryProvider()),
          ChangeNotifierProvider(create: (_) => LoanSavingProvider()),
          ChangeNotifierProvider(create: (_) => ProfileProvider()),
        ],
        child: MyApp(authProvider: authProvider),
      ),
    );
    print('App started successfully');
  } catch (e) {
    print('App start error: $e');
  }
}

class MyApp extends StatelessWidget {
  final AuthProvider authProvider;
  const MyApp({super.key, required this.authProvider});

  @override
  Widget build(BuildContext context) {
    print(
        'Building MyApp with router: ${AppRoutes.createRouter(authProvider)}');
    return MaterialApp.router(
      title: 'Ifelodun Cooperative App',
      themeMode: ThemeMode.system, // Automatically follows system setting
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: AppRoutes.createRouter(authProvider),
      debugShowCheckedModeBanner: false,
    );
  }
}
