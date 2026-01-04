<?php
// Test OTP timing fix
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

echo "Testing OTP Timing Fix...\n\n";

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
    
    echo "✅ Database connection successful\n\n";
    
    // Test the new timing logic
    echo "Testing new OTP expiration calculation...\n";
    
    $stmt = $pdo->query("SELECT NOW() as current_time, DATE_ADD(NOW(), INTERVAL 10 MINUTE) as expires_time");
    $timeResult = $stmt->fetch();
    
    echo "Database Current Time: " . $timeResult['current_time'] . "\n";
    echo "Database Expires Time: " . $timeResult['expires_time'] . "\n";
    
    // Calculate difference
    $current = strtotime($timeResult['current_time']);
    $expires = strtotime($timeResult['expires_time']);
    $diffMinutes = ($expires - $current) / 60;
    
    echo "Time Difference: $diffMinutes minutes\n";
    
    if ($diffMinutes == 10) {
        echo "✅ Expiration calculation is correct!\n\n";
    } else {
        echo "❌ Expiration calculation is still wrong\n\n";
    }
    
    // Test creating a new OTP with the fixed logic
    echo "Creating test OTP with fixed timing...\n";
    
    $memberId = 148;
    $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = $timeResult['expires_time'];
    
    echo "Generated OTP: $otp\n";
    echo "Expires At: $expiresAt\n";
    
    // Insert test OTP
    $stmt = $pdo->prepare("
        INSERT INTO password_resets (member_id, otp, expires_at) 
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$memberId, $otp, $expiresAt]);
    
    echo "✅ Test OTP inserted\n";
    
    // Verify the inserted record
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = ? AND otp = ?");
    $stmt->execute([$memberId, $otp]);
    $record = $stmt->fetch();
    
    if ($record) {
        echo "\nVerifying inserted record:\n";
        echo "Created: " . $record['created_at'] . "\n";
        echo "Expires: " . $record['expires_at'] . "\n";
        
        $created = strtotime($record['created_at']);
        $expires = strtotime($record['expires_at']);
        $actualDiff = ($expires - $created) / 60;
        
        echo "Actual difference: $actualDiff minutes\n";
        
        if ($actualDiff >= 9 && $actualDiff <= 11) { // Allow 1 minute tolerance
            echo "✅ OTP timing is now correct!\n";
        } else {
            echo "❌ OTP timing is still incorrect\n";
        }
        
        // Clean up test record
        $stmt = $pdo->prepare("DELETE FROM password_resets WHERE id = ?");
        $stmt->execute([$record['id']]);
        echo "✅ Test record cleaned up\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
