<?php
// Minimal auth.php to test basic functionality
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

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

// Handle routing
$request_method = $_SERVER['REQUEST_METHOD'];
$path_info = $_SERVER['PATH_INFO'] ?? '';

switch ($request_method) {
    case 'GET':
        if ($path_info === '/test') {
            // Simple test endpoint
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'message' => 'Auth endpoint is working',
                'path_info' => $path_info,
                'env_loaded' => isset($_ENV['DB_HOST']) ? 'yes' : 'no'
            ]);
            exit;
        } else {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Method not allowed']);
            exit;
        }
        break;
    case 'POST':
        if ($path_info === '/login') {
            handleLogin();
        } else {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Endpoint not found']);
            exit;
        }
        break;
    default:
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Method not allowed']);
        exit;
}

function handleLogin() {
    try {
        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid JSON input']);
            exit;
        }

        // Basic validation without using Validator class for now
        if (!isset($input['identifier']) || empty(trim($input['identifier']))) {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Identifier is required']);
            exit;
        }

        if (!isset($input['password']) || empty(trim($input['password']))) {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Password is required']);
            exit;
        }
    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Error processing request: ' . $e->getMessage()]);
        exit;
    }

    $identifier = trim($input['identifier']);
    $password = trim($input['password']);

    // Validate password length
    if (strlen($password) < 6) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Password must be at least 6 characters']);
        exit;
    }

    try {
        // Create direct database connection
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $dbname = $_ENV['DB_NAME'] ?? '';
        $username = $_ENV['DB_USER'] ?? '';
        $password_db = $_ENV['DB_PASSWORD'] ?? '';

        if (empty($dbname) || empty($username)) {
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Database credentials not configured',
                'identifier' => $identifier,
                'env_check' => [
                    'DB_HOST' => isset($_ENV['DB_HOST']) ? 'set' : 'missing',
                    'DB_NAME' => isset($_ENV['DB_NAME']) ? 'set' : 'missing',
                    'DB_USER' => isset($_ENV['DB_USER']) ? 'set' : 'missing',
                    'DB_PASSWORD' => isset($_ENV['DB_PASSWORD']) ? 'set' : 'missing'
                ]
            ]);
            exit;
        }

        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname",
            $username,
            $password_db,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );

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
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid credentials',
                'identifier' => $identifier
            ]);
            exit;
        }

        // Verify password
        if (!password_verify($password, $user['password'])) {
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid credentials',
                'identifier' => $identifier
            ]);
            exit;
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
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'message' => 'Member record not found'
            ]);
            exit;
        }

        // Generate JWT token
        $jwt_secret = $_ENV['JWT_SECRET'] ?? 'your-secret-key';
        $issued_at = time();
        $expiration_time = $issued_at + (60 * 60); // 1 hour

        $token_payload = [
            'id' => $user['id'],
            'role' => $user['role'],
            'iat' => $issued_at,
            'exp' => $expiration_time
        ];

        // Try to generate JWT token
        try {
            if (class_exists('Firebase\JWT\JWT')) {
                $token = \Firebase\JWT\JWT::encode($token_payload, $jwt_secret, 'HS256');
            } else {
                // Fallback: create a simple token without JWT library
                $token = base64_encode(json_encode($token_payload));
            }
        } catch (Exception $jwt_error) {
            // Fallback: create a simple token
            $token = base64_encode(json_encode($token_payload));
        }

        header('Content-Type: application/json');
        echo json_encode([
            'token' => $token,
            'role' => $user['role'],
            'name' => $member['first_name'] . ' ' . $member['last_name'],
            'member_id' => $member['id'],
            'user_id' => $user['id'],
            'expires_in' => 3600 // 1 hour in seconds
        ]);
        exit;

    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed',
            'identifier' => $identifier,
            'error' => $e->getMessage(),
            'error_code' => $e->getCode()
        ]);
        exit;
    }
}
?>
