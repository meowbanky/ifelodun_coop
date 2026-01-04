<?php
// Simplified auth.php for testing
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Handle routing
$request_method = $_SERVER['REQUEST_METHOD'];
$path_info = $_SERVER['PATH_INFO'] ?? '';

switch ($request_method) {
    case 'GET':
        if ($path_info === '/test') {
            echo json_encode([
                'status' => 'success',
                'message' => 'Auth endpoint is working',
                'path_info' => $path_info,
                'method' => $request_method
            ]);
        } else {
            echo json_encode(['error' => 'Method not allowed for GET']);
        }
        break;
    case 'POST':
        if ($path_info === '/login') {
            // Simple login test without database
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                echo json_encode(['error' => 'Invalid JSON input']);
                exit;
            }
            
            echo json_encode([
                'status' => 'received',
                'message' => 'Login endpoint reached',
                'received_data' => $input,
                'path_info' => $path_info
            ]);
        } else {
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
    default:
        echo json_encode(['error' => 'Method not allowed']);
}
?>
