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
$path_info = $_SERVER['PATH_INFO'] ?? '';

// Parse the path to extract member ID
$path_parts = explode('/', trim($path_info, '/'));

switch ($request_method) {
    case 'GET':
        if (count($path_parts) >= 1 && is_numeric($path_parts[0])) {
            $memberId = $path_parts[0];
            handleGetProfile($memberId);
        } else {
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Endpoint not found']);
            exit;
        }
        break;
    case 'PUT':
        if (count($path_parts) >= 1 && is_numeric($path_parts[0])) {
            $memberId = $path_parts[0];
            handleUpdateProfile($memberId);
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

function handleGetProfile($memberId) {
    // Authenticate token
    $user = authenticateToken();

    try {
        // Use shared DB connection helper
        require_once __DIR__ . '/database.php';
        $pdo = getDbConnection();

        // Get member info (email now lives in users table)
        $stmt = $pdo->prepare("
            SELECT m.id, m.member_id, m.first_name, m.last_name, m.middle_name, m.phone_number,
                   u.email AS email, m.address, m.date_of_birth, m.gender, m.employment_status, m.user_id
            FROM members m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE m.id = ?
        ");
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member) {
            header('Content-Type: application/json');
            http_response_code(404);
            echo json_encode(['error' => 'Member not found']);
            exit;
        }

        // Get next of kin
        $stmt = $pdo->prepare("
            SELECT id, first_name, last_name, relationship, phone_number, address
            FROM next_of_kin
            WHERE member_id = ?
        ");
        $stmt->execute([$memberId]);
        $nextOfKin = $stmt->fetch();

        $response = $member;
        unset($response['user_id']);
        $response['next_of_kin'] = $nextOfKin ?: null;

        header('Content-Type: application/json');
        echo json_encode($response);

    } catch (Exception $e) {
        error_log("Get profile error: " . $e->getMessage());
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching profile']);
    }
}

function handleUpdateProfile($memberId) {
    // Authenticate token
    authenticateToken();

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    try {
        // Use shared DB connection helper
        require_once __DIR__ . '/database.php';
        $pdo = getDbConnection();
        
        // Build dynamic update query for member
        $updates = [];
        $values = [];
        
        $allowedFields = [
            'first_name', 'last_name', 'middle_name', 'phone_number', 
            'address', 'date_of_birth', 'gender', 'employment_status'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updates[] = "$field = ?";
                $values[] = $input[$field];
            }
        }

        // Update member if there are fields to update
        if (!empty($updates)) {
            $values[] = $memberId; // Add member ID for WHERE clause
            $stmt = $pdo->prepare("UPDATE members SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($values);
        }

        // If email provided, update users table
        if (isset($input['email'])) {
            // Fetch user_id for this member
            $stmt = $pdo->prepare("SELECT user_id FROM members WHERE id = ?");
            $stmt->execute([$memberId]);
            $row = $stmt->fetch();
            if ($row && isset($row['user_id']) && $row['user_id']) {
                $userId = $row['user_id'];
                // Check uniqueness
                $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
                $stmt->execute([$input['email'], $userId]);
                $exists = $stmt->fetch();
                if ($exists) {
                    header('Content-Type: application/json');
                    http_response_code(409);
                    echo json_encode(['error' => 'Email already in use']);
                    return;
                }
                // Update
                $stmt = $pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
                $stmt->execute([$input['email'], $userId]);
            }
        }

        // Handle next of kin update/insert
        if (isset($input['next_of_kin']) && is_array($input['next_of_kin'])) {
            $nok = $input['next_of_kin'];
            
            // Check if next of kin exists
            $stmt = $pdo->prepare("SELECT id FROM next_of_kin WHERE member_id = ?");
            $stmt->execute([$memberId]);
            $nokExists = $stmt->fetch();

            if ($nokExists) {
                // Update existing next of kin
                $stmt = $pdo->prepare("
                    UPDATE next_of_kin 
                    SET first_name = ?, last_name = ?, relationship = ?, phone_number = ?, address = ? 
                    WHERE member_id = ?
                ");
                $stmt->execute([
                    $nok['first_name'] ?? '',
                    $nok['last_name'] ?? '',
                    $nok['relationship'] ?? '',
                    $nok['phone_number'] ?? '',
                    $nok['address'] ?? '',
                    $memberId
                ]);
            } else {
                // Insert new next of kin
                $stmt = $pdo->prepare("
                    INSERT INTO next_of_kin (member_id, first_name, last_name, relationship, phone_number, address) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $memberId,
                    $nok['first_name'] ?? '',
                    $nok['last_name'] ?? '',
                    $nok['relationship'] ?? '',
                    $nok['phone_number'] ?? '',
                    $nok['address'] ?? ''
                ]);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Profile updated successfully']);

    } catch (Exception $e) {
        error_log("Update profile error: " . $e->getMessage());
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Error updating profile']);
    }
}
?>