<?php
// Load environment variables
if (file_exists('.env')) {
    $lines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

// Authentication function
function authenticateToken() {
    // Try multiple ways to get the Authorization header
    $authHeader = '';

    // Method 1: getallheaders() if available
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    // Method 2: $_SERVER variables
    if (empty($authHeader)) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    }

    // Method 3: Apache specific
    if (empty($authHeader) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    // Method 4: Environment variable set by .htaccess
    if (empty($authHeader) && isset($_ENV['HTTP_AUTHORIZATION'])) {
        $authHeader = $_ENV['HTTP_AUTHORIZATION'];
    }

    if (empty($authHeader)) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Token required']);
        exit;
    }

    $token = str_replace('Bearer ', '', $authHeader);

    // For now, just decode the base64 token we created
    $decoded = json_decode(base64_decode($token), true);

    if (!$decoded || !isset($decoded['id']) || !isset($decoded['exp'])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }

    // Check if token is expired
    if ($decoded['exp'] < time()) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Token expired']);
        exit;
    }

    return $decoded;
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
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Method not allowed']);
        exit;
}

function handleChangePassword() {
    // Authenticate token
    authenticateToken();

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    // Validate required fields
    if (!isset($input['user_id']) || !isset($input['old_password']) || !isset($input['new_password'])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Missing required fields: user_id, old_password, new_password']);
        exit;
    }

    $memberIdOrUserId = $input['user_id']; // This might be member_id from Flutter app
    $oldPassword = $input['old_password'];
    $newPassword = $input['new_password'];

    // Validate new password
    if (strlen($newPassword) < 6) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'New password must be at least 6 characters long']);
        exit;
    }

    try {
        // Create direct database connection
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $dbname = $_ENV['DB_NAME'] ?? '';
        $username = $_ENV['DB_USER'] ?? '';
        $dbPassword = $_ENV['DB_PASSWORD'] ?? '';

        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname",
            $username,
            $dbPassword,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );

        // First try to get user by user_id, if not found try by member_id
        $stmt = $pdo->prepare("SELECT id, password FROM users WHERE id = ?");
        $stmt->execute([$memberIdOrUserId]);
        $user = $stmt->fetch();

        if (!$user) {
            // Try to find user by member_id
            $stmt = $pdo->prepare("
                SELECT u.id, u.password
                FROM users u
                JOIN members m ON u.id = m.user_id
                WHERE m.id = ?
            ");
            $stmt->execute([$memberIdOrUserId]);
            $user = $stmt->fetch();
        }

        if (!$user) {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        $actualUserId = $user['id'];

        // Check old password
        if (!password_verify($oldPassword, $user['password'])) {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Old password incorrect']);
            exit;
        }

        // Hash and update new password
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$hashedPassword, $actualUserId]);

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Password changed successfully']);

    } catch (Exception $e) {
        error_log("Change password error: " . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Internal server error']);
    }
}
?>
