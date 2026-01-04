<?php
// Diagnostic file to check what's working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$diagnostics = [
    'php_version' => phpversion(),
    'timestamp' => date('Y-m-d H:i:s'),
    'status' => 'PHP is working'
];

// Check if vendor directory exists
if (file_exists('vendor/autoload.php')) {
    $diagnostics['composer'] = 'vendor directory found';
    try {
        require_once 'vendor/autoload.php';
        $diagnostics['autoload'] = 'autoload successful';
    } catch (Exception $e) {
        $diagnostics['autoload_error'] = $e->getMessage();
    }
} else {
    $diagnostics['composer'] = 'vendor directory NOT found';
}

// Check if .env file exists
if (file_exists('.env')) {
    $diagnostics['env_file'] = '.env file found';
} else {
    $diagnostics['env_file'] = '.env file NOT found';
}

// Check if config files exist
if (file_exists('../config/database.php')) {
    $diagnostics['database_config'] = 'database.php found';
} else {
    $diagnostics['database_config'] = 'database.php NOT found';
}

// Check if utils files exist
if (file_exists('../utils/auth.php')) {
    $diagnostics['auth_utils'] = 'auth.php found';
} else {
    $diagnostics['auth_utils'] = 'auth.php NOT found';
}

echo json_encode($diagnostics, JSON_PRETTY_PRINT);
?>
