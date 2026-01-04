<?php
// Check all OTP records for member 148
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
    
    echo "All OTP records for member 148 (latest first):\n\n";
    
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = 148 ORDER BY created_at DESC LIMIT 5");
    $stmt->execute();
    $otps = $stmt->fetchAll();
    
    if ($otps) {
        foreach ($otps as $i => $otp) {
            echo "Record " . ($i + 1) . ":\n";
            echo "ID: " . $otp['id'] . "\n";
            echo "OTP: " . $otp['otp'] . "\n";
            echo "Created: " . $otp['created_at'] . "\n";
            echo "Expires: " . $otp['expires_at'] . "\n";
            echo "Used: " . ($otp['used'] ? 'Yes' : 'No') . "\n";
            
            // Calculate time difference
            $created = strtotime($otp['created_at']);
            $expires = strtotime($otp['expires_at']);
            $diffMinutes = ($expires - $created) / 60;
            echo "Difference: $diffMinutes minutes\n";
            
            if ($diffMinutes >= 9 && $diffMinutes <= 11) {
                echo "✅ Timing correct\n";
            } else {
                echo "❌ Timing incorrect\n";
            }
            
            echo "---\n";
        }
    } else {
        echo "No OTP records found for member 148\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
