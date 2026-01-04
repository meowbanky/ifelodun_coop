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
        if ($path_info === '/login') {
            handleLogin();
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleLogin() {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        ApiResponse::error('Invalid JSON input');
    }

    // Validate required fields
    $errors = Validator::validateRequired($input, ['identifier', 'password']);
    if (!empty($errors)) {
        ApiResponse::error($errors[0]);
    }

    $identifier = trim($input['identifier']);
    $password = trim($input['password']);

    // Validate password length
    if (!Validator::validateMinLength($password, 6)) {
        ApiResponse::error('Password must be at least 6 characters');
    }

    try {
        $pdo = getDbConnection();
        
        // Query to find user by username, email, or phone number
        $stmt = $pdo->prepare("
            SELECT u.*, m.phone_number, m.first_name, m.last_name, m.id as member_id
            FROM users u 
            INNER JOIN members m ON u.id = m.user_id 
            WHERE (u.username = ? OR u.email = ? OR m.phone_number = ?) 
            AND u.is_active = 1
        ");
        
        $stmt->execute([$identifier, $identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user) {
            error_log("User not found for identifier: " . $identifier);
            ApiResponse::error('Invalid credentials', 401);
        }

        error_log("User authenticated: " . $user['id']);
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            ApiResponse::error('Invalid credentials', 401);
        }

        // Fetch member details
        $stmt = $pdo->prepare("
            SELECT member_id, id, first_name, last_name 
            FROM members 
            WHERE user_id = ? 
            LIMIT 1
        ");
        
        $stmt->execute([$user['id']]);
        $member = $stmt->fetch();

        if (!$member) {
            ApiResponse::error('Member record not found', 404);
        }

        // Generate JWT token
        $token = AuthUtils::generateToken([
            'id' => $user['id'],
            'role' => $user['role']
        ]);

        ApiResponse::success([
            'token' => $token,
            'role' => $user['role'],
            'name' => $member['first_name'] . ' ' . $member['last_name'],
            'member_id' => $member['id']
        ]);

    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        ApiResponse::error('Internal server error', 500);
    }
}
?>