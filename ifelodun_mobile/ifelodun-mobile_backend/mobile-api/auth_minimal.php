<?php
// Minimal auth.php to test basic functionality
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Handle routing
$request_method = $_SERVER['REQUEST_METHOD'];
$path_info = $_SERVER['PATH_INFO'] ?? '';

try {
    switch ($request_method) {
        case 'GET':
            if ($path_info === '/test') {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Auth endpoint is working',
                    'path_info' => $path_info,
                    'method' => $request_method,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } else {
                echo json_encode(['error' => 'Method not allowed for GET']);
            }
            break;
            
        case 'POST':
            if ($path_info === '/login') {
                // Get JSON input
                $input_raw = file_get_contents('php://input');
                $input = json_decode($input_raw, true);
                
                if (!$input) {
                    echo json_encode([
                        'error' => 'Invalid JSON input',
                        'raw_input' => $input_raw
                    ]);
                    exit;
                }
                
                // Basic validation
                if (!isset($input['identifier']) || empty(trim($input['identifier']))) {
                    echo json_encode(['error' => 'Identifier is required']);
                    exit;
                }
                
                if (!isset($input['password']) || empty(trim($input['password']))) {
                    echo json_encode(['error' => 'Password is required']);
                    exit;
                }
                
                // For now, just return success without database check
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Login endpoint reached successfully',
                    'identifier' => $input['identifier'],
                    'password_length' => strlen($input['password']),
                    'note' => 'Database connection not implemented yet'
                ]);
                
            } else {
                echo json_encode([
                    'error' => 'Endpoint not found',
                    'path_info' => $path_info,
                    'available_endpoints' => ['/login']
                ]);
            }
            break;
            
        default:
            echo json_encode([
                'error' => 'Method not allowed',
                'method' => $request_method,
                'allowed_methods' => ['GET', 'POST']
            ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Exception occurred',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
} catch (Error $e) {
    echo json_encode([
        'error' => 'Fatal error occurred',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
