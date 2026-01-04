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
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Method not allowed']);
        exit;
}

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
        echo json_encode([
            'error' => 'Token required',
            'debug' => [
                'getallheaders_available' => function_exists('getallheaders'),
                'http_authorization' => isset($_SERVER['HTTP_AUTHORIZATION']) ? 'present' : 'missing',
                'redirect_auth' => isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? 'present' : 'missing',
                'env_auth' => isset($_ENV['HTTP_AUTHORIZATION']) ? 'present' : 'missing',
                'all_headers' => function_exists('getallheaders') ? array_keys(getallheaders()) : 'not available'
            ]
        ]);
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

function handleGetPeriods() {
    // Authenticate token
    $user = authenticateToken();

    try {
        // Create direct database connection
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $dbname = $_ENV['DB_NAME'] ?? '';
        $username = $_ENV['DB_USER'] ?? '';
        $password = $_ENV['DB_PASSWORD'] ?? '';

        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );

        $stmt = $pdo->prepare("SELECT id, name FROM periods ORDER BY id ASC");
        $stmt->execute();
        $periods = $stmt->fetchAll();

        header('Content-Type: application/json');
        echo json_encode(['data' => $periods]);

    } catch (Exception $e) {
        error_log("Get periods error: " . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Error fetching periods']);
    }
}
?>
