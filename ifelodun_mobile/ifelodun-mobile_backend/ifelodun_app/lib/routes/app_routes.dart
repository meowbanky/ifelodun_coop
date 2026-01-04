import 'package:flutter/material.dart';
import '../screens/login_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/splash_screen.dart';
import '../providers/auth_provider.dart';
import '../screens/main_screen.dart';
import 'package:go_router/go_router.dart';
import '../screens/forgot_password_screen.dart';
import '../screens/registration_screen.dart';
import '../screens/notification_screen.dart';
import '../screens/change_password_screen.dart';

class AppRoutes {
  static GoRouter createRouter(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: '/splash',
      refreshListenable: authProvider,
      redirect: (context, state) {
        final isLoggedIn = authProvider.isAuthenticated;
        final location = state.uri.toString();

        if (location == '/splash') return null;
        // Allow unauthenticated access to /login, /forgot-password, and /register
        if (!isLoggedIn &&
            location != '/login' &&
            location != '/forgot-password' &&
            location != '/register') {
          return '/login';
        }
        if (isLoggedIn && location == '/login') return '/';
        return null;
      },
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/',
          builder: (context, state) => const MainScreen(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => const SettingsScreen(),
        ),
        GoRoute(
          path: '/forgot-password',
          builder: (context, state) => const ForgotPasswordScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegistrationScreen(),
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationScreen(),
        ),
        GoRoute(
          path: '/change-password',
          builder: (context, state) => const ChangePasswordScreen(),
        ),
      ],
    );
  }
}
