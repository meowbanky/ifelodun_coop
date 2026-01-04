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

// Parse the path to extract user ID and action
$path_parts = explode('/', trim($path_info, '/'));

switch ($request_method) {
    case 'GET':
        if (count($path_parts) >= 1 && is_numeric($path_parts[0])) {
            $userId = $path_parts[0];
            handleGetNotifications($userId);
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    case 'POST':
        if (count($path_parts) >= 2 && is_numeric($path_parts[0]) && $path_parts[1] === 'read') {
            $notificationId = $path_parts[0];
            handleMarkAsRead($notificationId);
        } elseif (empty($path_info) || $path_info === '/') {
            handleCreateNotification();
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleGetNotifications($userId) {
    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY date DESC
        ");
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll();

        ApiResponse::success($notifications);

    } catch (Exception $e) {
        error_log("Get notifications error: " . $e->getMessage());
        ApiResponse::error('Error fetching notifications', 500);
    }
}

function handleMarkAsRead($notificationId) {
    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ?
        ");
        $stmt->execute([$notificationId]);

        ApiResponse::success(['message' => 'Notification marked as read']);

    } catch (Exception $e) {
        error_log("Mark as read error: " . $e->getMessage());
        ApiResponse::error('Error marking notification as read', 500);
    }
}

function handleCreateNotification() {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        ApiResponse::error('Invalid JSON input');
    }

    // Validate required fields
    $errors = Validator::validateRequired($input, ['user_id', 'title', 'body']);
    if (!empty($errors)) {
        ApiResponse::error($errors[0]);
    }

    $userId = $input['user_id'];
    $title = trim($input['title']);
    $body = trim($input['body']);

    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, body) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$userId, $title, $body]);

        ApiResponse::success(['message' => 'Notification created']);

    } catch (Exception $e) {
        error_log("Create notification error: " . $e->getMessage());
        ApiResponse::error('Error creating notification', 500);
    }
}
?>
