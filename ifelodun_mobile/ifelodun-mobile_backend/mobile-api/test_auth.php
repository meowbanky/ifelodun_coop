<?php
// Simple test file to check auth.php issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$response = [
    'status' => 'testing',
    'php_version' => phpversion(),
    'timestamp' => date('Y-m-d H:i:s')
];

// Test if vendor autoload exists
if (file_exists('../vendor/autoload.php')) {
    $response['vendor_autoload'] = 'found at ../vendor/autoload.php';
    try {
        require_once '../vendor/autoload.php';
        $response['autoload_loaded'] = 'success';
    } catch (Exception $e) {
        $response['autoload_error'] = $e->getMessage();
    }
} elseif (file_exists('vendor/autoload.php')) {
    $response['vendor_autoload'] = 'found at vendor/autoload.php';
    try {
        require_once 'vendor/autoload.php';
        $response['autoload_loaded'] = 'success';
    } catch (Exception $e) {
        $response['autoload_error'] = $e->getMessage();
    }
} else {
    $response['vendor_autoload'] = 'NOT FOUND';
}

// Test if config files exist
$response['config_database'] = file_exists('../config/database.php') ? 'found' : 'NOT FOUND';
$response['utils_auth'] = file_exists('../utils/auth.php') ? 'found' : 'NOT FOUND';
$response['env_file'] = file_exists('.env') ? 'found' : 'NOT FOUND';

// Test if we can include config files
try {
    if (file_exists('../config/database.php')) {
        require_once '../config/database.php';
        $response['database_config_loaded'] = 'success';
    }
} catch (Exception $e) {
    $response['database_config_error'] = $e->getMessage();
}

try {
    if (file_exists('../utils/auth.php')) {
        require_once '../utils/auth.php';
        $response['auth_utils_loaded'] = 'success';
    }
} catch (Exception $e) {
    $response['auth_utils_error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
