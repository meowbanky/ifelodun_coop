<?php
// Check latest OTP timing
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
    
    echo "Checking latest OTP for member 148...\n\n";
    
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = 148 ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $otp = $stmt->fetch();
    
    if ($otp) {
        echo "Latest OTP Record:\n";
        echo "ID: " . $otp['id'] . "\n";
        echo "Member ID: " . $otp['member_id'] . "\n";
        echo "OTP: " . $otp['otp'] . "\n";
        echo "Created: " . $otp['created_at'] . "\n";
        echo "Expires: " . $otp['expires_at'] . "\n";
        echo "Used: " . ($otp['used'] ? 'Yes' : 'No') . "\n\n";
        
        // Calculate time difference
        $created = strtotime($otp['created_at']);
        $expires = strtotime($otp['expires_at']);
        $diffMinutes = ($expires - $created) / 60;
        
        echo "Time Analysis:\n";
        echo "Created timestamp: $created\n";
        echo "Expires timestamp: $expires\n";
        echo "Difference: $diffMinutes minutes\n\n";
        
        if ($diffMinutes >= 9 && $diffMinutes <= 11) {
            echo "✅ OTP timing is CORRECT! (~10 minutes)\n";
        } else {
            echo "❌ OTP timing is still incorrect (should be ~10 minutes)\n";
        }
        
        // Check if still valid
        $stmt = $pdo->query("SELECT NOW() as now_time");
        $current = $stmt->fetch();
        
        echo "\nValidity Check:\n";
        echo "Current time: " . $current['now_time'] . "\n";
        echo "Expires at: " . $otp['expires_at'] . "\n";
        
        if ($current['now_time'] < $otp['expires_at']) {
            $remainingMinutes = (strtotime($otp['expires_at']) - strtotime($current['now_time'])) / 60;
            echo "✅ OTP is still valid (expires in " . round($remainingMinutes, 1) . " minutes)\n";
        } else {
            echo "❌ OTP has expired\n";
        }
        
    } else {
        echo "No OTP records found for member 148\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
