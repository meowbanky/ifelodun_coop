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

// Parse the path to extract member ID
$path_parts = explode('/', trim($path_info, '/'));

switch ($request_method) {
    case 'GET':
        if (count($path_parts) >= 1 && is_numeric($path_parts[0])) {
            $memberId = $path_parts[0];
            handleGetProfile($memberId);
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    case 'PUT':
        if (count($path_parts) >= 1 && is_numeric($path_parts[0])) {
            $memberId = $path_parts[0];
            handleUpdateProfile($memberId);
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleGetProfile($memberId) {
    // Authenticate token
    AuthUtils::authenticateToken();
    
    try {
        $pdo = getDbConnection();
        
        // Get member info
        $stmt = $pdo->prepare("
            SELECT id, member_id, first_name, last_name, middle_name, phone_number, 
                   email, address, date_of_birth, gender, employment_status 
            FROM members 
            WHERE id = ?
        ");
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member) {
            ApiResponse::error('Member not found', 404);
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
        $response['next_of_kin'] = $nextOfKin ?: null;

        ApiResponse::success($response);

    } catch (Exception $e) {
        error_log("Get profile error: " . $e->getMessage());
        ApiResponse::error('Error fetching profile', 500);
    }
}

function handleUpdateProfile($memberId) {
    // Authenticate token
    AuthUtils::authenticateToken();
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        ApiResponse::error('Invalid JSON input');
    }

    try {
        $pdo = getDbConnection();
        
        // Build dynamic update query for member
        $updates = [];
        $values = [];
        
        $allowedFields = [
            'first_name', 'last_name', 'middle_name', 'phone_number', 
            'email', 'address', 'date_of_birth', 'gender', 'employment_status'
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

        ApiResponse::success(['message' => 'Profile updated successfully']);

    } catch (Exception $e) {
        error_log("Update profile error: " . $e->getMessage());
        ApiResponse::error('Error updating profile', 500);
    }
}
?>
