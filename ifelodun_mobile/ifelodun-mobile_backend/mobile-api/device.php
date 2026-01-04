<?php
require_once '../config/database.php';
require_once '../utils/auth.php';

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

// Handle routing
$request_method = $_SERVER['REQUEST_METHOD'];
$path_info = $_SERVER['PATH_INFO'] ?? '';

switch ($request_method) {
    case 'POST':
        if ($path_info === '/update-device') {
            handleUpdateDevice();
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleUpdateDevice() {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        ApiResponse::error('Invalid JSON input');
    }

    // Validate required fields
    $errors = Validator::validateRequired($input, ['user_id', 'device_id']);
    if (!empty($errors)) {
        ApiResponse::error('Missing fields');
    }

    $userId = $input['user_id'];
    $deviceId = $input['device_id'];

    try {
        $pdo = getDbConnection();
        
        // Get current device_id
        $stmt = $pdo->prepare("SELECT device_id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            ApiResponse::error('User not found', 404);
        }

        // If device_id is different or not set, update it
        if (!$user['device_id'] || $user['device_id'] !== $deviceId) {
            $stmt = $pdo->prepare("UPDATE users SET device_id = ? WHERE id = ?");
            $stmt->execute([$deviceId, $userId]);
            
            ApiResponse::success(['message' => 'Device ID updated']);
        }

        ApiResponse::success(['message' => 'Device ID already up to date']);

    } catch (Exception $e) {
        error_log("Update device error: " . $e->getMessage());
        ApiResponse::error('Internal server error', 500);
    }
}
?>
