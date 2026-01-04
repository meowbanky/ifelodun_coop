<?php
// Main API Router for Ifelodun Mobile Backend
// This file routes requests to the appropriate API endpoints

// Load environment variables
if (file_exists('../.env')) {
    $lines = file('../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get the request URI and remove the base path
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/mobile_app2/mobile-api'; // Adjust this based on your server configuration

// Remove base path and query string
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace($base_path, '', $path);
$path = trim($path, '/');

// Split path into segments
$path_segments = explode('/', $path);
$endpoint = $path_segments[0] ?? '';

// Route to appropriate API file
switch ($endpoint) {
    case 'auth':
        // Remove 'auth' from path and set PATH_INFO for auth.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'auth.php';
        break;
        
    case 'member':
        // Remove 'member' from path and set PATH_INFO for member.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'member.php';
        break;
        
    case 'notifications':
        // Remove 'notifications' from path and set PATH_INFO for notifications.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'notifications.php';
        break;
        
    case 'change-password':
        // Remove 'change-password' from path and set PATH_INFO for change_password.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'change_password.php';
        break;
        
    case 'device':
        // Remove 'device' from path and set PATH_INFO for device.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'device.php';
        break;
        
    case 'forgot-password':
        // Remove 'forgot-password' from path and set PATH_INFO for forgot_password.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'forgot_password.php';
        break;
        
    case 'period':
        // Remove 'period' from path and set PATH_INFO for period.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'period.php';
        break;
        
    case 'profile':
        // Remove 'profile' from path and set PATH_INFO for profile.php
        array_shift($path_segments);
        $_SERVER['PATH_INFO'] = '/' . implode('/', $path_segments);
        require_once 'profile.php';
        break;
        
    case 'debug':
        // Debug endpoint to help troubleshoot routing
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'request_uri' => $request_uri,
            'base_path' => $base_path,
            'path_after_base_removal' => $path,
            'path_segments' => $path_segments,
            'endpoint' => $endpoint,
            'path_info' => $_SERVER['PATH_INFO'] ?? 'not set'
        ]);
        break;

    case '':
        // Root API endpoint - show available endpoints
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Ifelodun Mobile Backend API',
            'version' => '1.0.0',
            'endpoints' => [
                'POST /mobile-api/auth/login' => 'User authentication',
                'GET /mobile-api/member/{id}/summary' => 'Get member summary',
                'GET /mobile-api/member/{id}/history' => 'Get member transaction history',
                'GET /mobile-api/member/{id}/profile' => 'Get member profile',
                'GET /mobile-api/member/{id}/settings' => 'Get member settings',
                'PUT /mobile-api/member/{id}/settings' => 'Update member settings',
                'GET /mobile-api/member/member/{id}/profile' => 'Get detailed member profile',
                'GET /mobile-api/notifications/{userId}' => 'Get user notifications',
                'POST /mobile-api/notifications/{id}/read' => 'Mark notification as read',
                'POST /mobile-api/notifications' => 'Create notification',
                'POST /mobile-api/change-password' => 'Change user password',
                'POST /mobile-api/device/update-device' => 'Update device ID',
                'GET /mobile-api/forgot-password/search' => 'Search members by name',
                'GET /mobile-api/forgot-password/{id}/email' => 'Get member email',
                'POST /mobile-api/forgot-password/{id}/send-otp' => 'Send OTP to email',
                'POST /mobile-api/forgot-password/{id}/verify-otp' => 'Verify OTP',
                'POST /mobile-api/forgot-password/{id}/reset-password' => 'Reset password',
                'POST /mobile-api/forgot-password/{id}/update-email' => 'Update email',
                'GET /mobile-api/period' => 'Get all periods',
                'GET /mobile-api/profile/{id}' => 'Get profile with next of kin',
                'PUT /mobile-api/profile/{id}' => 'Update profile and next of kin'
            ]
        ]);
        break;
        
    default:
        // Unknown endpoint
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}
?>
