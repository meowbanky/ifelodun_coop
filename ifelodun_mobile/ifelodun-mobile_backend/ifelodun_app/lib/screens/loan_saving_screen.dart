import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/loan_saving_provider.dart';

class SavingsWithLoanScreen extends StatefulWidget {
  const SavingsWithLoanScreen({super.key});

  @override
  State<SavingsWithLoanScreen> createState() => _SavingsWithLoanScreenState();
}

class _SavingsWithLoanScreenState extends State<SavingsWithLoanScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _localAllow = false;
  double _localAmount = 0.0;
  bool _hasInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) =>
        Provider.of<LoanSavingProvider>(context, listen: false)
            .fetchSettings());
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<LoanSavingProvider>(context);

    // Initialize local values only once when data is first loaded
    if (!provider.loading &&
        provider.allowSavingsWithLoan != null &&
        !_hasInitialized) {
      _localAllow = provider.allowSavingsWithLoan!;
      _localAmount = provider.savingsWithLoanAmount ?? 0.0;
      _hasInitialized = true;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = Theme.of(context).colorScheme.surface;
    final shadow = [
      BoxShadow(
        color: isDark ? Colors.black12 : Colors.grey.withOpacity(0.18),
        blurRadius: 22,
        offset: const Offset(0, 7),
      )
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Savings With Loan'),
      ),
      body: provider.loading && provider.allowSavingsWithLoan == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Card(
                    elevation: 0,
                    color: cardColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    shadowColor: shadow.first.color,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.volunteer_activism,
                              color: isDark ? Colors.greenAccent : Colors.green,
                              size: 38),
                          const SizedBox(height: 10),
                          Text(
                            "Savings With Loan",
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "This feature helps you keep building your shares and savings—even while repaying a loan. You can enable it and choose an amount to save monthly while you have an active loan.",
                            style: TextStyle(
                                fontSize: 15,
                                color: isDark
                                    ? Colors.grey[400]
                                    : Colors.grey[700]),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Form(
                    key: _formKey,
                    child: Card(
                      elevation: 0,
                      color: cardColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SwitchListTile(
                              value: _localAllow,
                              onChanged: provider.loading
                                  ? null
                                  : (v) => setState(() => _localAllow = v),
                              title: const Text("Allow Savings While On Loan",
                                  style:
                                      TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: const Text(
                                  "Turn ON to keep saving monthly while repaying a loan."),
                            ),
                            const SizedBox(height: 10),
                            if (_localAllow)
                              TextFormField(
                                initialValue: _localAmount > 0
                                    ? _localAmount.toString()
                                    : '',
                                decoration: const InputDecoration(
                                  labelText: "Amount to Save Each Month",
                                  prefixText: '₦ ',
                                  border: OutlineInputBorder(),
                                ),
                                keyboardType: TextInputType.numberWithOptions(
                                    decimal: true),
                                validator: (v) {
                                  if (!_localAllow) return null;
                                  if (v == null || v.trim().isEmpty) {
                                    return "Amount required";
                                  }
                                  final n =
                                      double.tryParse(v.replaceAll(',', ''));
                                  if (n == null || n < 100) {
                                    return "Enter a valid amount (≥ ₦100)";
                                  }
                                  return null;
                                },
                                onChanged: (v) {
                                  final val =
                                      double.tryParse(v.replaceAll(',', '')) ??
                                          0.0;
                                  _localAmount = val;
                                },
                              ),
                            if (_localAllow) const SizedBox(height: 14),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.save_alt_rounded),
                                onPressed: provider.loading
                                    ? null
                                    : () async {
                                        if (!_localAllow) _localAmount = 0.0;
                                        if (!_localAllow ||
                                            _formKey.currentState?.validate() ==
                                                true) {
                                          await provider.updateSettings(
                                              _localAllow, _localAmount);

                                          if (!mounted) return;

                                          if (provider.error != null) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(SnackBar(
                                              content: Text(provider.error!),
                                              backgroundColor: Colors.red,
                                            ));
                                          } else if (provider.successMsg !=
                                              null) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(SnackBar(
                                              content:
                                                  Text(provider.successMsg!),
                                              backgroundColor: Colors.green,
                                            ));
                                            // Reset initialization flag so form can be updated again
                                            _hasInitialized = false;
                                          }
                                        }
                                      },
                                label: Text(
                                  provider.loading
                                      ? "Saving..."
                                      : "Save Settings",
                                  style: const TextStyle(fontSize: 17),
                                ),
                                style: ElevatedButton.styleFrom(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 13),
                                  textStyle: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16)),
                                ),
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
                  )
                ],
              ),
            ),
    );
  }
}
