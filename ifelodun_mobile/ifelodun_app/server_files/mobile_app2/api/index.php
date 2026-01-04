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
$basePath = '/mobile_app2/mobile-api';
$route = str_replace($basePath, '', $path);
$method = $_SERVER['REQUEST_METHOD'];

// Log the request for debugging
error_log("API Request: $method $route");

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
        
        // Health check
        case $method == 'GET' && $route == '/health':
            echo json_encode(['status' => 'healthy', 'timestamp' => date('c')]);
            break;
        
        // Default case
        default:
            http_response_code(404);
            echo json_encode([
                'error' => 'Endpoint not found', 
                'route' => $route, 
                'method' => $method,
                'available_endpoints' => [
                    'POST /auth/login',
                    'GET /member/{id}/summary',
                    'GET /member/{id}/history',
                    'GET /notifications/{userId}',
                    'GET /period',
                    'GET /health'
                ]
            ]);
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
    
    // Sample authentication - replace with your actual logic
    if ($identifier === 'testuser' && $password === 'password123') {
        echo json_encode([
            'token' => 'sample_jwt_token_' . time(),
            'role' => 'member',
            'name' => 'Test User',
            'member_id' => 1
        ]);
    } elseif ($identifier === 'admin' && $password === 'admin123') {
        echo json_encode([
            'token' => 'admin_jwt_token_' . time(),
            'role' => 'admin',
            'name' => 'Admin User',
            'member_id' => 999
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
    // Sample data - replace with database query
    echo json_encode([
        'member_id' => (int)$memberId,
        'total_savings' => 150000,
        'total_shares' => 75000,
        'loan_balance' => 25000,
        'last_transaction' => '2025-08-30',
        'account_status' => 'active',
        'monthly_contribution' => 5000
    ]);
}

// Member history handler
function handleMemberHistory($memberId) {
    // Sample data - replace with database query
    echo json_encode([
        'data' => [
            [
                'id' => 1,
                'type' => 'Deposit',
                'amount' => 5000,
                'date' => '2025-08-30',
                'description' => 'Monthly savings contribution',
                'balance' => 150000
            ],
            [
                'id' => 2,
                'type' => 'Share Purchase',
                'amount' => 2500,
                'date' => '2025-08-25',
                'description' => 'Share purchase',
                'balance' => 145000
            ],
            [
                'id' => 3,
                'type' => 'Loan Repayment',
                'amount' => 3000,
                'date' => '2025-08-20',
                'description' => 'Loan repayment',
                'balance' => 142500
            ]
        ]
    ]);
}

// Member settings handler
function handleMemberSettings($memberId) {
    // Sample data - replace with database query
    echo json_encode([
        'savings_target' => 200000,
        'notification_enabled' => true,
        'auto_save' => false,
        'monthly_target' => 10000,
        'preferred_contact' => 'email'
    ]);
}

// Get profile handler
function handleGetProfile($memberId) {
    // Sample data - replace with database query
    echo json_encode([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'middle_name' => 'Smith',
        'email' => 'john.doe@example.com',
        'phone_number' => '08012345678',
        'address' => '123 Main Street, Lagos',
        'date_of_birth' => '1990-01-15',
        'gender' => 'Male',
        'employment_status' => 'Employed',
        'next_of_kin' => [
            'name' => 'Jane Doe',
            'relationship' => 'Spouse',
            'phone' => '08087654321',
            'address' => '123 Main Street, Lagos'
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
    // Sample data - replace with database query
    echo json_encode([
        'data' => [
            [
                'id' => 1,
                'title' => 'Welcome to Ifelodun Cooperative!',
                'body' => 'Thank you for joining our cooperative society.',
                'date' => '2025-08-31T10:00:00Z',
                'read' => false
            ],
            [
                'id' => 2,
                'title' => 'Monthly Contribution Reminder',
                'body' => 'Your monthly contribution of ₦5,000 is due in 3 days.',
                'date' => '2025-08-30T09:00:00Z',
                'read' => true
            ],
            [
                'id' => 3,
                'title' => 'Loan Application Approved',
                'body' => 'Your loan application for ₦50,000 has been approved.',
                'date' => '2025-08-29T14:30:00Z',
                'read' => false
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
    
    // Sample data - replace with database query
    echo json_encode([
        'members' => [
            [
                'id' => 1,
                'name' => 'John Doe',
                'member_number' => 'IFS001'
            ],
            [
                'id' => 2,
                'name' => 'Jane Smith',
                'member_number' => 'IFS002'
            ],
            [
                'id' => 3,
                'name' => 'Mike Johnson',
                'member_number' => 'IFS003'
            ]
        ]
    ]);
}

// Get member email handler
function handleGetMemberEmail($memberId) {
    // Sample data - replace with database query
    echo json_encode(['email' => 'member' . $memberId . '@example.com']);
}

// Send OTP handler
function handleSendOTP($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    // TODO: Generate and send OTP via email
    echo json_encode(['message' => 'OTP sent successfully to ' . $email]);
}

// Verify OTP handler
function handleVerifyOTP($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $otp = $input['otp'] ?? '';
    
    // Sample OTP verification - replace with actual logic
    if ($otp === '123456') {
        echo json_encode(['message' => 'OTP verified successfully']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or expired OTP']);
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
    
    // TODO: Verify OTP and reset password in database
    echo json_encode(['message' => 'Password reset successfully']);
}

// Update email handler
function handleUpdateEmail($memberId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        return;
    }
    
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
    
    // TODO: Verify old password and update new password in database
    echo json_encode(['message' => 'Password changed successfully']);
}

// Get periods handler
function handleGetPeriods() {
    // Sample data - replace with database query
    echo json_encode([
        'data' => [
            ['id' => 1, 'name' => 'January 2025', 'start_date' => '2025-01-01', 'end_date' => '2025-01-31'],
            ['id' => 2, 'name' => 'February 2025', 'start_date' => '2025-02-01', 'end_date' => '2025-02-28'],
            ['id' => 3, 'name' => 'March 2025', 'start_date' => '2025-03-01', 'end_date' => '2025-03-31'],
            ['id' => 4, 'name' => 'April 2025', 'start_date' => '2025-04-01', 'end_date' => '2025-04-30'],
            ['id' => 5, 'name' => 'May 2025', 'start_date' => '2025-05-01', 'end_date' => '2025-05-31'],
            ['id' => 6, 'name' => 'June 2025', 'start_date' => '2025-06-01', 'end_date' => '2025-06-30'],
            ['id' => 7, 'name' => 'July 2025', 'start_date' => '2025-07-01', 'end_date' => '2025-07-31'],
            ['id' => 8, 'name' => 'August 2025', 'start_date' => '2025-08-01', 'end_date' => '2025-08-31']
        ]
    ]);
}
?>
