<?php
// Check password_resets table structure
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
    
    echo "Password resets table structure:\n\n";
    
    $stmt = $pdo->query("DESCRIBE password_resets");
    $columns = $stmt->fetchAll();
    
    foreach ($columns as $column) {
        echo "Column: " . $column['Field'] . "\n";
        echo "Type: " . $column['Type'] . "\n";
        echo "Null: " . $column['Null'] . "\n";
        echo "Key: " . $column['Key'] . "\n";
        echo "Default: " . $column['Default'] . "\n";
        echo "Extra: " . $column['Extra'] . "\n";
        echo "---\n";
    }
    
    echo "\nTable indexes:\n";
    $stmt = $pdo->query("SHOW INDEX FROM password_resets");
    $indexes = $stmt->fetchAll();
    
    foreach ($indexes as $index) {
        echo "Key: " . $index['Key_name'] . "\n";
        echo "Column: " . $index['Column_name'] . "\n";
        echo "Unique: " . ($index['Non_unique'] ? 'No' : 'Yes') . "\n";
        echo "---\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
