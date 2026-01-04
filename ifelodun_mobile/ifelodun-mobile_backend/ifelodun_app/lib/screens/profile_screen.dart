import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/profile_model.dart';
import '../providers/profile_provider.dart';
import '../providers/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController firstNameCtrl;
  late TextEditingController lastNameCtrl;
  late TextEditingController middleNameCtrl;
  late TextEditingController phoneCtrl;
  late TextEditingController emailCtrl;
  late TextEditingController addressCtrl;
  late TextEditingController dobCtrl;
  late TextEditingController genderCtrl;
  late TextEditingController employmentCtrl;

  // Next of Kin
  late TextEditingController nokFirstNameCtrl;
  late TextEditingController nokLastNameCtrl;
  late TextEditingController nokRelationCtrl;
  late TextEditingController nokPhoneCtrl;
  late TextEditingController nokAddressCtrl;

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<ProfileProvider>(context, listen: false);
    provider.fetchProfile().then((_) {
      final p = provider.profile;
      if (p != null) setControllers(p);
    });
    setControllers(null);
  }

  void setControllers(MemberProfile? profile) {
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
    return Consumer<ProfileProvider>(
      builder: (context, provider, _) {
        if (provider.loading && provider.profile == null) {
          return const Center(child: CircularProgressIndicator());
        }
        final p = provider.profile;
        if (p == null) {
          return Center(child: Text(provider.error ?? "No profile found"));
        }

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
          body: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Personal Information",
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: firstNameCtrl,
                          decoration:
                              const InputDecoration(labelText: "First Name"),
                          validator: (v) => v!.isEmpty ? "Required" : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: lastNameCtrl,
                          decoration:
                              const InputDecoration(labelText: "Last Name"),
                          validator: (v) => v!.isEmpty ? "Required" : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: middleNameCtrl,
                    decoration: const InputDecoration(labelText: "Middle Name"),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: phoneCtrl,
                    decoration:
                        const InputDecoration(labelText: "Phone Number"),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: emailCtrl,
                    decoration: const InputDecoration(labelText: "Email"),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: addressCtrl,
                    decoration: const InputDecoration(labelText: "Address"),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: dobCtrl,
                    readOnly: true,
                    decoration: const InputDecoration(
                      labelText: "Date of Birth",
                      suffixIcon: Icon(Icons.calendar_today),
                    ),
                    onTap: _pickDateOfBirth,
                    validator: (v) => v == null || v.isEmpty
                        ? "Date of Birth is required"
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: genderCtrl,
                    decoration: const InputDecoration(labelText: "Gender"),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: employmentCtrl,
                    decoration:
                        const InputDecoration(labelText: "Employment Status"),
                  ),
                  const SizedBox(height: 24),
                  Divider(),
                  Text("Next of Kin",
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: nokFirstNameCtrl,
                          decoration:
                              const InputDecoration(labelText: "First Name"),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: nokLastNameCtrl,
                          decoration:
                              const InputDecoration(labelText: "Last Name"),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: nokRelationCtrl,
                    decoration:
                        const InputDecoration(labelText: "Relationship"),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: nokPhoneCtrl,
                    decoration:
                        const InputDecoration(labelText: "Phone Number"),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: nokAddressCtrl,
                    decoration: const InputDecoration(labelText: "Address"),
                  ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.save_alt_rounded),
                      label: Text(provider.updating ? "Saving..." : "Save"),
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
}
