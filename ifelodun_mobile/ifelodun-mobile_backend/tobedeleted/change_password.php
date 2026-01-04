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

switch ($request_method) {
    case 'POST':
        handleChangePassword();
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleChangePassword() {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        ApiResponse::error('Invalid JSON input');
    }

    // Validate required fields
    $errors = Validator::validateRequired($input, ['user_id', 'old_password', 'new_password']);
    if (!empty($errors)) {
        ApiResponse::error('Missing fields');
    }

    $userId = $input['user_id'];
    $oldPassword = $input['old_password'];
    $newPassword = $input['new_password'];

    try {
        $pdo = getDbConnection();
        
        // Get current password hash
        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            ApiResponse::error('User not found', 404);
        }

        // Check old password
        if (!password_verify($oldPassword, $user['password'])) {
            ApiResponse::error('Old password incorrect');
        }

        // Hash and update new password
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$hashedPassword, $userId]);

        ApiResponse::success(['message' => 'Password changed successfully']);

    } catch (Exception $e) {
        error_log("Change password error: " . $e->getMessage());
        ApiResponse::error('Internal server error', 500);
    }
}
?>
