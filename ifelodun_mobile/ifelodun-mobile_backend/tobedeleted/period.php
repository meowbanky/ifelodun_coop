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
    case 'GET':
        handleGetPeriods();
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleGetPeriods() {
    // Authenticate token
    AuthUtils::authenticateToken();
    
    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("SELECT id, name FROM periods ORDER BY id ASC");
        $stmt->execute();
        $periods = $stmt->fetchAll();

        ApiResponse::success(['data' => $periods]);

    } catch (Exception $e) {
        error_log("Get periods error: " . $e->getMessage());
        ApiResponse::error('Error fetching periods', 500);
    }
}
?>
