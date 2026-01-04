# Ifelodun Mobile Backend - PHP API Conversion

This directory contains the PHP conversion of the Node.js/Express routes from the `routes/` folder.

## Structure

```
api/
├── index.php              # Main API router
├── auth.php               # Authentication endpoints
├── member.php             # Member-related endpoints
├── notifications.php      # Notification endpoints
├── change_password.php    # Password change endpoint
├── device.php             # Device management endpoint
├── forgot_password.php    # Password reset endpoints
├── period.php             # Period management endpoint
├── profile.php            # Profile management endpoints
└── .htaccess             # URL rewriting rules

config/
└── database.php          # Database connection configuration

utils/
└── auth.php              # Authentication utilities and helpers

composer.json             # PHP dependencies
```

## Installation

1. Install PHP dependencies:
   ```bash
   composer install
   ```

2. Configure your web server to point to the `api/` directory

3. Set up environment variables in `.env` file:
   ```
   DB_HOST=localhost
   DB_NAME=your_database
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=your-secret-key
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Member Management
- `GET /api/member/{id}/summary` - Get member financial summary
- `GET /api/member/{id}/history` - Get member transaction history
- `GET /api/member/{id}/profile` - Get basic member profile
- `GET /api/member/{id}/settings` - Get member settings
- `PUT /api/member/{id}/settings` - Update member settings
- `GET /api/member/member/{id}/profile` - Get detailed member profile with next of kin

### Notifications
- `GET /api/notifications/{userId}` - Get user notifications
- `POST /api/notifications/{id}/read` - Mark notification as read
- `POST /api/notifications` - Create new notification

### Password Management
- `POST /api/change-password` - Change user password
- `GET /api/forgot-password/search` - Search members by name
- `GET /api/forgot-password/{id}/email` - Get member email
- `POST /api/forgot-password/{id}/send-otp` - Send OTP to email
- `POST /api/forgot-password/{id}/verify-otp` - Verify OTP
- `POST /api/forgot-password/{id}/reset-password` - Reset password with OTP
- `POST /api/forgot-password/{id}/update-email` - Update member email

### Device Management
- `POST /api/device/update-device` - Update device ID for user

### Periods
- `GET /api/period` - Get all periods

### Profile Management
- `GET /api/profile/{id}` - Get profile with next of kin
- `PUT /api/profile/{id}` - Update profile and next of kin

## Key Differences from Node.js Version

1. **Database Connection**: Uses PDO instead of mysql2/promise
2. **JWT Handling**: Uses firebase/php-jwt library
3. **Password Hashing**: Uses PHP's built-in password_hash/password_verify
4. **Email Sending**: Uses PHP's mail() function (can be upgraded to PHPMailer)
5. **Error Handling**: Centralized through ApiResponse class
6. **Validation**: Custom Validator class for input validation

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation
- SQL injection prevention with prepared statements
- CORS headers configured

## Usage Examples

### Login
```bash
curl -X POST http://your-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "username", "password": "password"}'
```

### Get Member Summary
```bash
curl -X GET http://your-domain/api/member/1/summary \
  -H "Authorization: Bearer your-jwt-token"
```

### Update Profile
```bash
curl -X PUT http://your-domain/api/profile/1 \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "John", "last_name": "Doe"}'
```

## Notes

- All endpoints return JSON responses
- Authentication required for most endpoints (marked in documentation)
- Error responses follow consistent format: `{"error": "message"}`
- Success responses follow format: `{"data": {...}}` or `{"message": "..."}`
