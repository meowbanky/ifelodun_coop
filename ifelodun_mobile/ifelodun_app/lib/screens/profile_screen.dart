import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/profile_model.dart';
import '../providers/profile_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import '../widgets/app_text_field.dart';
// Device management removed in this revert

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _controllersReady = false;
  bool _isUpdatingControllers = false;
  bool _seededFromProvider = false;

  late TextEditingController firstNameCtrl;
  late TextEditingController lastNameCtrl;
  late TextEditingController middleNameCtrl;
  late TextEditingController phoneCtrl;
  late TextEditingController emailCtrl;
  late TextEditingController addressCtrl;
  late TextEditingController dobCtrl;
  late TextEditingController genderCtrl;
  late TextEditingController employmentCtrl;
  // KYC fields removed in this revert

  // Next of Kin
  late TextEditingController nokFirstNameCtrl;
  late TextEditingController nokLastNameCtrl;
  late TextEditingController nokRelationCtrl;
  late TextEditingController nokPhoneCtrl;
  late TextEditingController nokAddressCtrl;

  @override
  void initState() {
    super.initState();
    // Initialize empty controllers synchronously to avoid first-build races
    _initEmptyControllers();

    final provider = Provider.of<ProfileProvider>(context, listen: false);
    provider.fetchProfile().then((_) {
      if (!mounted || _seededFromProvider) return;
      final p = provider.profile;
      if (p != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || _seededFromProvider) return;
          setControllers(p);
          _seededFromProvider = true;
        });
      }
    });
  }

  void _initEmptyControllers() {
    if (_controllersReady) return;
    firstNameCtrl = TextEditingController(text: "");
    lastNameCtrl = TextEditingController(text: "");
    middleNameCtrl = TextEditingController(text: "");
    phoneCtrl = TextEditingController(text: "");
    emailCtrl = TextEditingController(text: "");
    addressCtrl = TextEditingController(text: "");
    dobCtrl = TextEditingController(text: "");
    genderCtrl = TextEditingController(text: "");
    employmentCtrl = TextEditingController(text: "");

    nokFirstNameCtrl = TextEditingController(text: "");
    nokLastNameCtrl = TextEditingController(text: "");
    nokRelationCtrl = TextEditingController(text: "");
    nokPhoneCtrl = TextEditingController(text: "");
    nokAddressCtrl = TextEditingController(text: "");
    _controllersReady = true;
  }

  void setControllers(MemberProfile? profile) {
    if (_isUpdatingControllers || !mounted) return;
    _isUpdatingControllers = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) { _isUpdatingControllers = false; return; }
      // Prevent focus/semantics churn while updating text programmatically
      FocusScope.of(context).unfocus();
      if (!_controllersReady) {
        // First-time initialization
        firstNameCtrl = TextEditingController(text: profile?.firstName ?? "");
        lastNameCtrl = TextEditingController(text: profile?.lastName ?? "");
        middleNameCtrl = TextEditingController(text: profile?.middleName ?? "");
        phoneCtrl = TextEditingController(text: profile?.phoneNumber ?? "");
        emailCtrl = TextEditingController(text: profile?.email ?? "");
        addressCtrl = TextEditingController(text: profile?.address ?? "");
        dobCtrl = TextEditingController(text: profile?.dateOfBirth ?? "");
        genderCtrl = TextEditingController(text: profile?.gender ?? "");
        employmentCtrl =
            TextEditingController(text: profile?.employmentStatus ?? "");

        nokFirstNameCtrl =
            TextEditingController(text: profile?.nextOfKin?.firstName ?? "");
        nokLastNameCtrl =
            TextEditingController(text: profile?.nextOfKin?.lastName ?? "");
        nokRelationCtrl =
            TextEditingController(text: profile?.nextOfKin?.relationship ?? "");
        nokPhoneCtrl =
            TextEditingController(text: profile?.nextOfKin?.phoneNumber ?? "");
        nokAddressCtrl =
            TextEditingController(text: profile?.nextOfKin?.address ?? "");
        _controllersReady = true;
        _isUpdatingControllers = false;
        return;
      }

      // Subsequent loads: update text values without recreating controllers
      void setText(TextEditingController c, String value) {
        final v = value;
        c.value = c.value.copyWith(
          text: v,
          selection: TextSelection.collapsed(offset: v.length),
          composing: TextRange.empty,
        );
      }
      setText(firstNameCtrl, profile?.firstName ?? "");
      setText(lastNameCtrl, profile?.lastName ?? "");
      setText(middleNameCtrl, profile?.middleName ?? "");
      setText(phoneCtrl, profile?.phoneNumber ?? "");
      setText(emailCtrl, profile?.email ?? "");
      setText(addressCtrl, profile?.address ?? "");
      setText(dobCtrl, profile?.dateOfBirth ?? "");
      setText(genderCtrl, profile?.gender ?? "");
      setText(employmentCtrl, profile?.employmentStatus ?? "");

      setText(nokFirstNameCtrl, profile?.nextOfKin?.firstName ?? "");
      setText(nokLastNameCtrl, profile?.nextOfKin?.lastName ?? "");
      setText(nokRelationCtrl, profile?.nextOfKin?.relationship ?? "");
      setText(nokPhoneCtrl, profile?.nextOfKin?.phoneNumber ?? "");
      setText(nokAddressCtrl, profile?.nextOfKin?.address ?? "");
      _isUpdatingControllers = false;
    });
  }

  @override
  void dispose() {
    firstNameCtrl.dispose();
    lastNameCtrl.dispose();
    middleNameCtrl.dispose();
    phoneCtrl.dispose();
    emailCtrl.dispose();
    addressCtrl.dispose();
    dobCtrl.dispose();
    genderCtrl.dispose();
    employmentCtrl.dispose();
    // KYC controller removed

    nokFirstNameCtrl.dispose();
    nokLastNameCtrl.dispose();
    nokRelationCtrl.dispose();
    nokPhoneCtrl.dispose();
    nokAddressCtrl.dispose();

    super.dispose();
  }

  Future<void> _pickDateOfBirth() async {
    DateTime? initialDate;
    if (dobCtrl.text.isNotEmpty) {
      try {
        initialDate = DateTime.parse(dobCtrl.text);
      } catch (_) {}
    }
    initialDate ??= DateTime(2000);

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      helpText: "Select Date of Birth",
    );
    if (picked != null) {
      dobCtrl.text = picked.toIso8601String().substring(0, 10);
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("My Profile"),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
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
                  Navigator.of(context)
                      .pushNamedAndRemoveUntil('/login', (route) => false);
                }
              }
            },
          ),
        ],
      ),
      body: Consumer<ProfileProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.profile == null) {
            return const Center(child: CircularProgressIndicator());
          }
          final p = provider.profile;
          if (p == null) {
            return Center(child: Text(provider.error ?? "No profile found"));
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Security settings
                  AppCard(
                    child: Row(
                      children: [
                        const Icon(Icons.fingerprint),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Use biometric to login',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        Consumer<AuthProvider>(
                          builder: (ctx, auth, _) {
                            return Switch(
                              value: auth.useBiometric,
                              onChanged: (v) {
                                auth.setUseBiometric(v);
                              },
                            );
                          },
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Personal Info Card
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Personal Information",
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                controller: firstNameCtrl,
                                label: "First Name",
                                validator: (v) =>
                                    v == null || v.isEmpty ? "Required" : null,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                controller: lastNameCtrl,
                                label: "Last Name",
                                validator: (v) =>
                                    v == null || v.isEmpty ? "Required" : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppTextField(
                          controller: middleNameCtrl,
                          label: "Middle Name",
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                controller: phoneCtrl,
                                label: "Phone Number",
                                keyboardType: TextInputType.phone,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                controller: emailCtrl,
                                label: "Email",
                                keyboardType: TextInputType.emailAddress,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppTextField(
                          controller: addressCtrl,
                          label: "Address",
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                controller: dobCtrl,
                                label: "Date of Birth",
                                readOnly: true,
                                onTap: _pickDateOfBirth,
                                suffixIcon: const Icon(Icons.calendar_today),
                                validator: (v) => v == null || v.isEmpty
                                    ? "Date of Birth is required"
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                controller: genderCtrl,
                                label: "Gender",
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppTextField(
                          controller: employmentCtrl,
                          label: "Employment Status",
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Next of Kin Card
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Next of Kin",
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                controller: nokFirstNameCtrl,
                                label: "First Name",
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                controller: nokLastNameCtrl,
                                label: "Last Name",
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                controller: nokRelationCtrl,
                                label: "Relationship",
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                controller: nokPhoneCtrl,
                                label: "Phone Number",
                                keyboardType: TextInputType.phone,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppTextField(
                          controller: nokAddressCtrl,
                          label: "Address",
                        ),
                      ],
                    ),
                  ),

                  // KYC section removed in this revert

                  const SizedBox(height: 16),
                  AppButton(
                    onPressed: provider.updating
                        ? null
                        : () async {
                            if (_formKey.currentState!.validate()) {
                              final updatedProfile = MemberProfile(
                                id: p.id,
                                memberId: p.memberId,
                                firstName: firstNameCtrl.text,
                                lastName: lastNameCtrl.text,
                                middleName: middleNameCtrl.text,
                                phoneNumber: phoneCtrl.text,
                                email: emailCtrl.text,
                                address: addressCtrl.text,
                                dateOfBirth: dobCtrl.text,
                                gender: genderCtrl.text,
                                employmentStatus: employmentCtrl.text,
                                nextOfKin: NextOfKin(
                                  id: p.nextOfKin?.id,
                                  firstName: nokFirstNameCtrl.text,
                                  lastName: nokLastNameCtrl.text,
                                  relationship: nokRelationCtrl.text,
                                  phoneNumber: nokPhoneCtrl.text,
                                  address: nokAddressCtrl.text,
                                ),
                              );

                              final ok = await Provider.of<ProfileProvider>(
                                      context,
                                      listen: false)
                                  .updateProfile(updatedProfile);
                              if (ok && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text("Profile updated!")),
                                );
                              } else if (provider.error != null && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                      content:
                                          Text("Error: ${provider.error}")),
                                );
                              }
                            }
                          },
                    leadingIcon:
                        provider.updating ? null : Icons.save_alt_rounded,
                    child: Text(provider.updating ? "Saving..." : "Save"),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
