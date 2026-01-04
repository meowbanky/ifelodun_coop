<?php
// Test SQL query
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

try {
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
    
    echo "Testing SQL queries...\n\n";
    
    // Test basic NOW()
    echo "1. Testing NOW():\n";
    $stmt = $pdo->query("SELECT NOW() as now_time");
    $result = $stmt->fetch();
    echo "Current time: " . $result['now_time'] . "\n\n";

    // Test DATE_ADD
    echo "2. Testing DATE_ADD:\n";
    $stmt = $pdo->query("SELECT DATE_ADD(NOW(), INTERVAL 10 MINUTE) as expire_time");
    $result = $stmt->fetch();
    echo "Expires time: " . $result['expire_time'] . "\n\n";

    // Test combined query
    echo "3. Testing combined query:\n";
    $stmt = $pdo->query("SELECT NOW() as now_time, DATE_ADD(NOW(), INTERVAL 10 MINUTE) as expire_time");
    $result = $stmt->fetch();
    echo "Current: " . $result['now_time'] . "\n";
    echo "Expires: " . $result['expire_time'] . "\n";
    
    $current = strtotime($result['now_time']);
    $expires = strtotime($result['expire_time']);
    $diffMinutes = ($expires - $current) / 60;
    echo "Difference: $diffMinutes minutes\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
