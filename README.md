# Ifelodun Cooperative Management System

A comprehensive cooperative management system with web admin panel, mobile app, and automated financial processing capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Mobile App](#mobile-app)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Ifelodun Cooperative Management System is a full-stack solution for managing cooperative societies. It provides:

- **Web Admin Panel**: React-based frontend for administrators to manage members, contributions, loans, periods, and generate reports
- **Mobile App**: Flutter-based mobile application for members to view their financial information, statements, and notifications
- **Backend APIs**: Node.js/Express and PHP APIs for web and mobile applications
- **Automated Processing**: Monthly transaction processing with automatic deductions, interest calculations, and notifications

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Web Frontend  │────────▶│  Node.js API    │────────▶│   MySQL DB      │
│   (React/Vite)  │         │  (Express)      │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                                      │
┌─────────────────┐         ┌─────────────────┐              │
│  Mobile App     │────────▶│   PHP API       │──────────────┘
│  (Flutter)      │         │  (Mobile Backend)│
└─────────────────┘         └─────────────────┘
```

### Components

1. **Frontend** (`/frontend`): React-based admin dashboard
2. **Server** (`/server`): Node.js/Express API for web admin
3. **Mobile Backend** (`/ifelodun_mobile/ifelodun-mobile_backend`): PHP API for mobile app
4. **Mobile App** (`/ifelodun_mobile/ifelodun_app`): Flutter mobile application

## 🛠️ Tech Stack

### Frontend (Web Admin)
- **Framework**: React 19.0.0
- **Build Tool**: Vite 6.1.0
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Headless UI, Heroicons, React Bootstrap
- **Charts**: Chart.js, React Chart.js 2
- **Forms**: Formik, Yup
- **Routing**: React Router DOM 7.2.0
- **HTTP Client**: Axios 1.8.1

### Backend (Node.js API)
- **Runtime**: Node.js 22.16.0
- **Framework**: Express 4.21.2
- **Database**: MySQL (mysql2 3.12.0)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **File Processing**: Multer, ExcelJS, pdf-parse
- **Email**: Nodemailer 6.10.0
- **Scheduling**: node-cron 3.0.3
- **AI Integration**: OpenAI 4.20.1

### Mobile Backend (PHP API)
- **Language**: PHP >= 7.4
- **Dependencies**: 
  - firebase/php-jwt ^6.0
  - phpmailer/phpmailer ^6.11
- **Database**: MySQL (PDO)

### Mobile App
- **Framework**: Flutter (SDK >=3.0.0 <4.0.0)
- **State Management**: Provider 6.1.2
- **Routing**: go_router 13.0.0
- **HTTP**: http 1.2.2, dio 5.2.0
- **Storage**: shared_preferences, flutter_secure_storage
- **PDF**: pdf 3.11.0, printing 5.13.4
- **Notifications**: flutter_local_notifications, firebase_messaging
- **Authentication**: local_auth (biometric)
- **Charts**: fl_chart 0.66.0

### Database
- **RDBMS**: MySQL 8.0.37
- **Key Tables**: members, users, contributions, loans, periods, notifications, coop_transactions, bank_statements

## 📁 Project Structure

```
ifelodun_coop/
├── frontend/                    # React admin frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── context/             # React context providers
│   │   ├── services/            # API service layer
│   │   └── utils/               # Utility functions
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Node.js backend API
│   ├── controllers/             # Business logic controllers
│   ├── routes/                  # API route definitions
│   ├── routes_mobile/           # Mobile-specific routes
│   ├── models/                  # Data models
│   ├── middleware/              # Express middleware
│   ├── migrations/              # Database migrations
│   ├── utils/                   # Utility functions
│   ├── config/                  # Configuration files
│   ├── uploads/                 # File uploads directory
│   ├── index.js                 # Server entry point
│   └── package.json
│
├── ifelodun_mobile/
│   ├── ifelodun_app/            # Flutter mobile app
│   │   ├── lib/
│   │   │   ├── screens/         # App screens
│   │   │   ├── providers/       # State management
│   │   │   ├── services/        # API services
│   │   │   ├── models/          # Data models
│   │   │   ├── widgets/         # Reusable widgets
│   │   │   ├── routes/          # Navigation routes
│   │   │   └── theme/           # App theming
│   │   ├── android/             # Android configuration
│   │   ├── ios/                 # iOS configuration
│   │   ├── pubspec.yaml
│   │   └── build_release.sh     # Release build script
│   │
│   └── ifelodun-mobile_backend/ # PHP mobile API
│       ├── mobile-api/          # API endpoints
│       ├── config/              # Configuration
│       ├── utils/               # Utility functions
│       ├── downloads/           # APK download page
│       ├── composer.json
│       └── index.php            # API router
│
└── README.md                    # This file
```

## ✨ Features

### Web Admin Panel

#### Member Management
- Member registration and profile management
- Member financial overview and history
- Bank details management
- Document upload and management
- Next of kin information

#### Financial Management
- Contribution entry and tracking
- Loan processing and management
- Loan types and interest rate configuration
- Guarantor management
- Fee configuration (entry fee, development levy, stationery)
- Withdrawal processing
- Commodity entry and tracking

#### Period Management
- Period creation and closure
- Monthly transaction processing
- Automatic deductions (entry fee, development levy, stationery)
- Interest calculations (charged and paid)
- Savings and shares allocation
- Loan repayment processing
- Commodity repayment tracking

#### Reports & Analytics
- Financial reports generation
- Member statements (Excel/PDF export)
- Transaction history
- Analytics dashboard with charts
- Period-wise summaries

#### Bank Statement Processing
- Upload bank statements (PDF, Excel, Images)
- AI-powered transaction extraction
- Automatic member name matching
- Transaction processing as contributions/loans
- Processing logs and audit trail

#### Notifications
- Email notifications for contributions
- SMS notifications (configurable)
- Notification templates
- Notification history tracking

#### Settings & Configuration
- User and role management
- System settings
- Category management for transactions
- Loan activation thresholds
- Stop interest settings

### Mobile App

#### Dashboard
- Financial summary (savings, shares, loans)
- Quick access to key features
- Unread notification count badge
- Visual charts and statistics

#### Profile Management
- View and update personal information
- Next of kin details
- Biometric login toggle
- Profile picture upload

#### Transaction History
- Detailed transaction history
- Filter by transaction type
- Period-wise grouping
- Export to PDF (bank statement format)

#### Loan & Savings
- View loan details and balances
- Savings and shares overview
- Loan repayment schedule
- Interest information

#### Notifications
- Push notifications
- In-app notification center
- Mark as read functionality
- Filter by read/unread status

#### Security
- Biometric authentication (fingerprint/face ID)
- Secure password storage
- Change password functionality
- Forgot password with OTP verification

#### Additional Features
- Dark mode support
- Offline data caching (planned)
- Over-the-air (OTA) app updates
- PDF statement generation

## 🚀 Installation & Setup

### Prerequisites

- Node.js 22.16.0 or higher
- PHP >= 7.4
- MySQL 8.0.37 or higher
- Flutter SDK >= 3.0.0
- Composer (for PHP dependencies)
- Git

### Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE ifelodu3_ifelodun CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

2. Run migrations (in order):
```bash
cd server
# Run migrations from server/migrations/
mysql -u username -p database_name < migrations/create_coop_transactions_table.sql
mysql -u username -p database_name < migrations/create_interest_tables.sql
mysql -u username -p database_name < migrations/create_bank_statement_tables.sql
mysql -u username -p database_name < migrations/create_transaction_categories_table.sql
# ... other migrations
```

### Backend Setup (Node.js)

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=ifelodu3_ifelodun
DB_PORT=3306
PORT=3001
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OpenAI (for bank statement processing)
OPENAI_API_KEY=your-openai-api-key
```

4. Start the server:
```bash
npm run dev  # Development with nodemon
# or
npm start    # Production
```

### Frontend Setup (React)

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

### Mobile Backend Setup (PHP)

1. Navigate to mobile backend directory:
```bash
cd ifelodun_mobile/ifelodun-mobile_backend
```

2. Install PHP dependencies:
```bash
composer install
```

3. Configure database in `config/database.php` or use environment variables:
```php
// Set via environment variables or directly in config/database.php
DB_HOST=localhost
DB_NAME=ifelodu3_ifelodun
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your-secret-key
```

4. Configure web server (Apache/Nginx) to point to this directory

### Mobile App Setup (Flutter)

1. Navigate to app directory:
```bash
cd ifelodun_mobile/ifelodun_app
```

2. Install dependencies:
```bash
flutter pub get
```

3. Configure API base URL in `lib/services/api_service.dart`:
```dart
static const String baseUrl = 'https://ifeloduncms.com.ng/mobile-api';
```

4. Run the app:
```bash
flutter run
```

5. Build release APK:
```bash
./build_release.sh [version] [build_number] [min_version] ["release notes"]
# Example:
./build_release.sh 1.0.2 3 1.0.1 "Bug fixes"
# Or auto-increment:
./build_release.sh  # Automatically increments version and build number
```

## ⚙️ Configuration

### Environment Variables

#### Node.js Backend (`server/.env`)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=ifelodu3_ifelodun
DB_PORT=3306
PORT=3001
JWT_SECRET=your-jwt-secret-key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
OPENAI_API_KEY=sk-...
```

#### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

#### PHP Mobile Backend
Configure in `config/database.php` or via environment variables:
```env
DB_HOST=localhost
DB_NAME=ifelodu3_ifelodun
DB_USER=root
DB_PASSWORD=password
JWT_SECRET=your-jwt-secret-key
```

### Firebase Configuration (Mobile App)

**Important**: Firebase configuration files containing API keys are excluded from git for security. You need to set them up locally.

1. Create Firebase project at https://console.firebase.google.com
2. Add Android/iOS apps to Firebase
3. Download configuration files:
   - Android: Download `google-services.json` from Firebase Console
   - iOS: Download `GoogleService-Info.plist` from Firebase Console
   - macOS: Download `GoogleService-Info.plist` from Firebase Console (same as iOS or separate)
4. Place files in the following locations:
   ```bash
   ifelodun_mobile/ifelodun_app/android/app/google-services.json
   ifelodun_mobile/ifelodun_app/ios/Runner/GoogleService-Info.plist
   ifelodun_mobile/ifelodun_app/macos/Runner/GoogleService-Info.plist
   ```
5. Generate `firebase_options.dart`:
   ```bash
   cd ifelodun_mobile/ifelodun_app
   flutterfire configure
   ```
   This will generate `lib/firebase_options.dart` with your Firebase configuration.

**Note**: Example/template files (`.example`) are provided in the repository. Copy them and fill in your Firebase project details if you prefer manual setup.

## 📡 API Documentation

### Node.js API Base URL
```
http://localhost:3001/api
```

### PHP Mobile API Base URL
```
https://ifeloduncms.com.ng/mobile-api
```

### Authentication

Most endpoints require JWT authentication. Include token in headers:
```
Authorization: Bearer <token>
```

### Key Endpoints

#### Web Admin API (Node.js)

**Authentication**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout

**Members**
- `GET /api/members` - List all members
- `GET /api/members/:id` - Get member details
- `POST /api/members` - Create member
- `PUT /api/members/:id` - Update member
- `GET /api/members/:id/financial` - Get member financial summary

**Contributions**
- `POST /api/contributions` - Create contribution
- `GET /api/contributions` - List contributions
- `GET /api/contributions/:id` - Get contribution details

**Loans**
- `POST /api/loans` - Create loan
- `GET /api/loans` - List loans
- `PUT /api/loans/:id` - Update loan
- `POST /api/loans/:id/repay` - Process loan repayment

**Periods**
- `GET /api/periods` - List periods
- `POST /api/periods` - Create period
- `POST /api/periods/:id/process` - Process monthly transactions
- `PUT /api/periods/:id/close` - Close period

**Reports**
- `GET /api/reports/member-statement/:id` - Generate member statement
- `GET /api/reports/financial-summary` - Financial summary report

**Bank Statements**
- `POST /api/bank-statements/upload` - Upload statement
- `POST /api/bank-statements/extract` - Extract transactions
- `POST /api/bank-statements/match-names` - Match member names
- `POST /api/bank-statements/process` - Process transactions

#### Mobile API (PHP)

**Authentication**
- `POST /mobile-api/auth/login` - Member login

**Member**
- `GET /mobile-api/member/{id}/summary` - Financial summary
- `GET /mobile-api/member/{id}/history` - Transaction history
- `GET /mobile-api/member/{id}/profile` - Member profile
- `GET /mobile-api/member/{id}/settings` - Member settings
- `PUT /mobile-api/member/{id}/settings` - Update settings

**Profile**
- `GET /mobile-api/profile/{id}` - Get profile with next of kin
- `PUT /mobile-api/profile/{id}` - Update profile

**Notifications**
- `GET /mobile-api/notifications/{userId}` - Get notifications
- `POST /mobile-api/notifications/{id}/read` - Mark as read
- `POST /mobile-api/notifications/mark-all-read` - Mark all as read

**Password**
- `POST /mobile-api/change-password` - Change password
- `GET /mobile-api/forgot-password/search` - Search member
- `POST /mobile-api/forgot-password/{id}/send-otp` - Send OTP
- `POST /mobile-api/forgot-password/{id}/verify-otp` - Verify OTP
- `POST /mobile-api/forgot-password/{id}/reset-password` - Reset password

**Periods**
- `GET /mobile-api/period` - Get all periods

**App Version**
- `GET /mobile-api/app_version.php` - Check app version for OTA updates

For detailed API documentation, see:
- `server/routes/` - Node.js route definitions
- `ifelodun_mobile/ifelodun-mobile_backend/PHP_API_README.md` - PHP API documentation

## 📱 Mobile App

### Building the App

#### Android Release Build

Use the automated build script:
```bash
cd ifelodun_mobile/ifelodun_app
./build_release.sh [version] [build] [min_version] ["notes"]
```

**Examples:**
```bash
# Auto-increment version and build
./build_release.sh

# Specify version and build
./build_release.sh 1.0.2 3

# Full specification
./build_release.sh 1.0.2 3 1.0.1 "Bug fixes and improvements"
```

The script will:
1. Update `pubspec.yaml` version automatically
2. Clean and build the APK
3. Generate SHA256 checksum
4. Create `app_version.json` for OTA updates
5. Copy APK to `ifelodun-{version}.apk`

#### Manual Build

```bash
flutter clean
flutter pub get
flutter build apk --release
```

### OTA Updates

The app supports over-the-air updates:

1. Build and upload APK to `https://ifeloduncms.com.ng/downloads/`
2. The build script automatically generates `app_version.json`
3. App checks version on launch and prompts for update
4. Users can download and install directly

### App Features

- **Biometric Login**: Fingerprint/Face ID authentication
- **Dark Mode**: System-aware theme switching
- **Offline Support**: Cached data for offline viewing (planned)
- **PDF Export**: Generate bank statement-style PDFs
- **Push Notifications**: Real-time notifications via Firebase
- **Secure Storage**: Encrypted credential storage

## 🚢 Deployment

### Production Deployment

See `DEPLOYMENT_SETUP.md` for detailed deployment instructions.

#### Quick Deployment Steps

1. **Backend (Node.js)**
   - Set up Node.js application in cPanel
   - Configure environment variables
   - Start application

2. **Frontend (React)**
   - Build: `npm run build`
   - Upload `dist/` to web server
   - Configure reverse proxy if needed

3. **Mobile Backend (PHP)**
   - Upload files to web server
   - Configure database connection
   - Set proper file permissions

4. **Mobile App**
   - Build release APK using `build_release.sh`
   - Upload APK to downloads directory
   - Deploy `app_version.json` to mobile-api directory

### CI/CD

GitHub Actions workflows are available for automated deployment:
- `deploy-backend.yml` - Deploy Node.js backend
- `deploy-frontend.yml` - Deploy React frontend
- `deploy-all.yml` - Smart deployment (detects changes)

Configure GitHub Secrets:
- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `BACKEND_DIR`
- `FRONTEND_DIR`

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test  # If tests are configured
```

### Frontend Testing
```bash
cd frontend
npm test  # If tests are configured
```

### Mobile App Testing
```bash
cd ifelodun_mobile/ifelodun_app
flutter test
```

## 📝 Database Schema

### Key Tables

- **members**: Member information
- **users**: System users (admins)
- **contributions**: Member contributions
- **loans**: Loan records
- **periods**: Financial periods
- **notifications**: User notifications
- **coop_transactions**: Cooperative transactions
- **bank_statements**: Bank statement uploads
- **extracted_transactions**: Extracted bank transactions
- **interest_charged**: Interest charged per period
- **interest_paid**: Interest paid per period
- **transaction_categories**: Transaction categories

See `server/migrations/` for complete schema definitions.

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention (prepared statements)
- CORS configuration
- Secure storage for mobile credentials
- Biometric authentication
- OTP-based password reset

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **JavaScript/TypeScript**: Follow ESLint configuration
- **Dart**: Follow Flutter/Dart style guide
- **PHP**: Follow PSR-12 coding standards

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For issues, questions, or contributions, please contact the development team.

## 🙏 Acknowledgments

- Flutter team for the excellent mobile framework
- React team for the frontend framework
- Express.js for the backend framework
- All open-source contributors whose packages are used in this project

---

**Version**: 1.0.1  
**Last Updated**: 2025
