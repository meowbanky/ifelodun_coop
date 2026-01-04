# PHP API Structure for Ifelodun Mobile App

Based on the Flutter app endpoints, here's the PHP API structure you need to create:

## Directory Structure
```
/mobile_app/
├── api/
│   ├── index.php              # Main API router
│   ├── .htaccess             # URL rewriting rules
│   ├── auth/
│   │   └── login.php         # POST /api/auth/login
│   ├── device/
│   │   └── update-device.php # POST /api/device/update-device
│   ├── member/
│   │   ├── summary.php       # GET /api/member/{id}/summary
│   │   ├── history.php       # GET /api/member/{id}/history
│   │   └── settings.php      # GET /api/member/{id}/settings
│   ├── profile/
│   │   └── profile.php       # GET/PUT /api/profile/{id}
│   ├── notifications/
│   │   ├── get.php          # GET /api/notifications/{userId}
│   │   └── read.php         # POST /api/notifications/{id}/read
│   ├── forgot-password/
│   │   ├── search.php       # GET /api/forgot-password/search
│   │   ├── email.php        # GET /api/forgot-password/{id}/email
│   │   ├── send-otp.php     # POST /api/forgot-password/{id}/send-otp
│   │   ├── verify-otp.php   # POST /api/forgot-password/{id}/verify-otp
│   │   ├── reset-password.php # POST /api/forgot-password/{id}/reset-password
│   │   └── update-email.php # POST /api/forgot-password/{id}/update-email
│   ├── change-password.php   # POST /api/change-password
│   └── period.php           # GET /api/period
```

## Required Files

### 1. /mobile_app/api/.htaccess
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

### 2. /mobile_app/api/index.php
```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$path = str_replace('/mobile_app/api', '', $path);
$method = $_SERVER['REQUEST_METHOD'];

// Route the requests
switch (true) {
    case $method == 'POST' && $path == '/auth/login':
        include 'auth/login.php';
        break;
    
    case $method == 'POST' && $path == '/device/update-device':
        include 'device/update-device.php';
        break;
    
    case $method == 'GET' && preg_match('/^\/member\/(\d+)\/summary$/', $path, $matches):
        $_GET['member_id'] = $matches[1];
        include 'member/summary.php';
        break;
    
    case $method == 'GET' && preg_match('/^\/member\/(\d+)\/history$/', $path, $matches):
        $_GET['member_id'] = $matches[1];
        include 'member/history.php';
        break;
    
    case $method == 'GET' && preg_match('/^\/member\/(\d+)\/settings$/', $path, $matches):
        $_GET['member_id'] = $matches[1];
        include 'member/settings.php';
        break;
    
    case preg_match('/^\/profile\/(\d+)$/', $path, $matches):
        $_GET['member_id'] = $matches[1];
        include 'profile/profile.php';
        break;
    
    case $method == 'GET' && preg_match('/^\/notifications\/(\d+)$/', $path, $matches):
        $_GET['user_id'] = $matches[1];
        include 'notifications/get.php';
        break;
    
    case $method == 'POST' && preg_match('/^\/notifications\/(\d+)\/read$/', $path, $matches):
        $_GET['notification_id'] = $matches[1];
        include 'notifications/read.php';
        break;
    
    case $method == 'GET' && $path == '/forgot-password/search':
        include 'forgot-password/search.php';
        break;
    
    case $method == 'POST' && $path == '/change-password':
        include 'change-password.php';
        break;
    
    case $method == 'GET' && $path == '/period':
        include 'period.php';
        break;
    
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}
?>
```

### 3. Sample endpoint: /mobile_app/api/auth/login.php
```php
<?php
// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['identifier']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing identifier or password']);
    exit;
}

$identifier = $input['identifier'];
$password = $input['password'];

// TODO: Replace with your actual authentication logic
// This is just a sample response
if ($identifier === 'testuser' && $password === 'password123') {
    echo json_encode([
        'token' => 'sample_jwt_token_here',
        'role' => 'member',
        'name' => 'Test User',
        'member_id' => 1
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
}
?>
```
