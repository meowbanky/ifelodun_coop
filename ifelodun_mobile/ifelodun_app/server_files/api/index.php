<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Get the request path and method
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

// Remove the base path to get the API route
$basePath = '/mobile_app/api';
$route = str_replace($basePath, '', $path);
$method = $_SERVER['REQUEST_METHOD'];

// Simple routing
try {
    switch (true) {
        // Authentication endpoints
        case $method == 'POST' && $route == '/auth/login':
            handleLogin();
            break;
        
        // Device management
        case $method == 'POST' && $route == '/device/update-device':
            handleDeviceUpdate();
            break;
        
        // Member endpoints
        case $method == 'GET' && preg_match('/^\/member\/(\d+)\/summary$/', $route, $matches):
            handleMemberSummary($matches[1]);
            break;
        
        case $method == 'GET' && preg_match('/^\/member\/(\d+)\/history$/', $route, $matches):
            handleMemberHistory($matches[1]);
            break;
        
        case $method == 'GET' && preg_match('/^\/member\/(\d+)\/settings$/', $route, $matches):
            handleMemberSettings($matches[1]);
            break;
        
        // Profile endpoints
        case $method == 'GET' && preg_match('/^\/profile\/(\d+)$/', $route, $matches):
            handleGetProfile($matches[1]);
            break;
        
        case $method == 'PUT' && preg_match('/^\/profile\/(\d+)$/', $route, $matches):
            handleUpdateProfile($matches[1]);
            break;
        
        // Notification endpoints
        case $method == 'GET' && preg_match('/^\/notifications\/(\d+)$/', $route, $matches):
            handleGetNotifications($matches[1]);
            break;
        
        case $method == 'POST' && preg_match('/^\/notifications\/(\d+)\/read$/', $route, $matches):
            handleMarkNotificationRead($matches[1]);
            break;
        
        // Password management
        case $method == 'GET' && $route == '/forgot-password/search':
            handleSearchMembers();
            break;
        
        case $method == 'GET' && preg_match('/^\/forgot-password\/(\d+)\/email$/', $route, $matches):
            handleGetMemberEmail($matches[1]);
            break;
        
        case $method == 'POST' && preg_match('/^\/forgot-password\/(\d+)\/send-otp$/', $route, $matches):
            handleSendOTP($matches[1]);
            break;
        
        case $method == 'POST' && preg_match('/^\/forgot-password\/(\d+)\/verify-otp$/', $route, $matches):
            handleVerifyOTP($matches[1]);
            break;
        
        case $method == 'POST' && preg_match('/^\/forgot-password\/(\d+)\/reset-password$/', $route, $matches):
            handleResetPassword($matches[1]);
            break;
        
        case $method == 'POST' && preg_match('/^\/forgot-password\/(\d+)\/update-email$/', $route, $matches):
            handleUpdateEmail($matches[1]);
            break;
        
        case $method == 'POST' && $route == '/change-password':
            handleChangePassword();
            break;
        
        // Period endpoint
        case $method == 'GET' && $route == '/period':
            handleGetPeriods();
            break;
        
        // Default case
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found', 'route' => $route, 'method' => $method]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error', 'message' => $e->getMessage()]);
}

// Authentication handler
function handleLogin() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['identifier']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing identifier or password']);
        return;
    }
    
    $identifier = $input['identifier'];
    $password = $input['password'];
    
    // TODO: Replace with actual database authentication
    // This is a sample implementation
    if ($identifier === 'testuser' && $password === 'password123') {
        echo json_encode([
            'token' => 'sample_jwt_token_' . time(),
            'role' => 'member',
            'name' => 'Test User',
            'member_id' => 1
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

// Device update handler
function handleDeviceUpdate() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['user_id']) || !isset($input['device_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing user_id or device_id']);
        return;
    }
    
    // TODO: Update device ID in database
    echo json_encode(['message' => 'Device updated successfully']);
}

// Member summary handler
function handleMemberSummary($memberId) {
    // TODO: Get from database
    echo json_encode([
        'member_id' => $memberId,
        'total_savings' => 50000,
        'total_shares' => 25000,
        'loan_balance' => 15000,
        'last_transaction' => '2025-08-30'
    ]);
}

// Member history handler
function handleMemberHistory($memberId) {
    // TODO: Get from database
    echo json_encode([
        'data' => [
            [
                'id' => 1,
                'type' => 'Deposit',
                'amount' => 5000,
                'date' => '2025-08-30',
                'description' => 'Monthly savings'
            ],
            [
                'id' => 2,
                'type' => 'Withdrawal',
                'amount' => 2000,
                'date' => '2025-08-25',
                'description' => 'Emergency withdrawal'
            ]
        ]
    ]);
}

// Member settings handler
function handleMemberSettings($memberId) {
    // TODO: Get from database
    echo json_encode([
        'savings_target' => 100000,
        'notification_enabled' => true,
        'auto_save' => false
    ]);
}

// Get profile handler
function handleGetProfile($memberId) {
    // TODO: Get from database
    echo json_encode([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'email' => 'john.doe@example.com',
        'phone_number' => '08012345678',
        'address' => '123 Main Street',
        'next_of_kin' => [
            'name' => 'Jane Doe',
            'relationship' => 'Spouse',
            'phone' => '08087654321'
        ]
    ]);
}

// Update profile handler
function handleUpdateProfile($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        return;
    }
    
    // TODO: Update in database
    echo json_encode(['message' => 'Profile updated successfully']);
}

// Get notifications handler
function handleGetNotifications($userId) {
    // TODO: Get from database
    echo json_encode([
        'data' => [
            [
                'id' => 1,
                'title' => 'Welcome!',
                'body' => 'Thank you for joining our app.',
                'date' => '2025-08-31T10:00:00Z',
                'read' => false
            ],
            [
                'id' => 2,
                'title' => 'Payment Reminder',
                'body' => 'Your monthly contribution is due.',
                'date' => '2025-08-30T09:00:00Z',
                'read' => true
            ]
        ]
    ]);
}

// Mark notification as read handler
function handleMarkNotificationRead($notificationId) {
    // TODO: Update in database
    echo json_encode(['message' => 'Notification marked as read']);
}

// Search members handler
function handleSearchMembers() {
    $name = $_GET['name'] ?? '';
    
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Name parameter is required']);
        return;
    }
    
    // TODO: Search in database
    echo json_encode([
        'members' => [
            [
                'id' => 1,
                'name' => 'John Doe',
                'member_number' => 'M001'
            ],
            [
                'id' => 2,
                'name' => 'Jane Smith',
                'member_number' => 'M002'
            ]
        ]
    ]);
}

// Get member email handler
function handleGetMemberEmail($memberId) {
    // TODO: Get from database
    echo json_encode(['email' => 'member@example.com']);
}

// Send OTP handler
function handleSendOTP($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    // TODO: Generate and send OTP
    echo json_encode(['message' => 'OTP sent successfully']);
}

// Verify OTP handler
function handleVerifyOTP($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $otp = $input['otp'] ?? '';
    
    // TODO: Verify OTP
    if ($otp === '123456') { // Sample OTP
        echo json_encode(['message' => 'OTP verified successfully']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid OTP']);
    }
}

// Reset password handler
function handleResetPassword($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['otp']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing OTP or password']);
        return;
    }
    
    // TODO: Reset password in database
    echo json_encode(['message' => 'Password reset successfully']);
}

// Update email handler
function handleUpdateEmail($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    // TODO: Update email in database
    echo json_encode(['message' => 'Email updated successfully']);
}

// Change password handler
function handleChangePassword() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['old_password']) || !isset($input['new_password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing old_password or new_password']);
        return;
    }
    
    // TODO: Verify old password and update new password
    echo json_encode(['message' => 'Password changed successfully']);
}

// Get periods handler
function handleGetPeriods() {
    // TODO: Get from database
    echo json_encode([
        'data' => [
            ['id' => 1, 'name' => 'January 2025', 'start_date' => '2025-01-01', 'end_date' => '2025-01-31'],
            ['id' => 2, 'name' => 'February 2025', 'start_date' => '2025-02-01', 'end_date' => '2025-02-28'],
            ['id' => 3, 'name' => 'March 2025', 'start_date' => '2025-03-01', 'end_date' => '2025-03-31']
        ]
    ]);
}
?>
