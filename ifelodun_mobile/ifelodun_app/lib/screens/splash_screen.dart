import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeIn;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2), // Reduced duration for better UX
    );
    _fadeIn = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut, // Smoother curve
      ),
    );
    _animationController.forward();

    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        context.go('/login'); // Navigates to login using go_router
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final media = MediaQuery.of(context).size;

    return Scaffold(
      // Use theme-aware background color
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Keep the decorative circular gradient (fixed colors)
          Positioned(
            top: -media.width * 0.6,
            right: -media.width * 0.3,
            child: Container(
              height: media.width * 1.2,
              width: media.width * 1.2,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Color(0xFFE0C3FC), Color(0xFF8EC5FC)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
              ),
            ),
          ),

          // Main content with theme adaptation
          Center(
            child: FadeTransition(
              opacity: _fadeIn,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo with error handling
                  Image.asset(
                    'assets/images/logo.png',
                    width: 100,
                    height: 100,
                    errorBuilder: (context, error, stackTrace) => Icon(
                      Icons.account_balance,
                      size: 100,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    "Ifelodun Isale-Oko Coop App",
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(
                      theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Navigation button
          
        ],
      ),
    );
  }
}
