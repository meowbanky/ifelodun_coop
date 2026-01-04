<?php
// Manually test OTP creation with correct timing
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
    
    echo "Manually creating OTP with correct timing...\n\n";
    
    $memberId = 148;
    
    // Delete existing OTP
    echo "1. Deleting existing OTP for member $memberId...\n";
    $stmt = $pdo->prepare("DELETE FROM password_resets WHERE member_id = ?");
    $stmt->execute([$memberId]);
    $deletedRows = $stmt->rowCount();
    echo "Deleted $deletedRows rows\n\n";
    
    // Generate new OTP with correct timing
    echo "2. Generating new OTP...\n";
    $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Use database NOW() function to ensure consistent timezone
    $stmt = $pdo->query("SELECT NOW() as now_time, DATE_ADD(NOW(), INTERVAL 10 MINUTE) as expire_time");
    $timeResult = $stmt->fetch();
    $expiresAt = $timeResult['expire_time'];
    
    echo "Generated OTP: $otp\n";
    echo "Current time: " . $timeResult['now_time'] . "\n";
    echo "Expires at: $expiresAt\n\n";
    
    // Insert new OTP
    echo "3. Inserting new OTP...\n";
    $stmt = $pdo->prepare("
        INSERT INTO password_resets (member_id, otp, expires_at) 
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$memberId, $otp, $expiresAt]);
    $insertId = $pdo->lastInsertId();
    echo "Inserted with ID: $insertId\n\n";
    
    // Verify the record
    echo "4. Verifying the record...\n";
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE id = ?");
    $stmt->execute([$insertId]);
    $record = $stmt->fetch();
    
    if ($record) {
        echo "Record verified:\n";
        echo "ID: " . $record['id'] . "\n";
        echo "Member ID: " . $record['member_id'] . "\n";
        echo "OTP: " . $record['otp'] . "\n";
        echo "Created: " . $record['created_at'] . "\n";
        echo "Expires: " . $record['expires_at'] . "\n";
        echo "Used: " . ($record['used'] ? 'Yes' : 'No') . "\n\n";
        
        // Calculate time difference
        $created = strtotime($record['created_at']);
        $expires = strtotime($record['expires_at']);
        $diffMinutes = ($expires - $created) / 60;
        
        echo "Time difference: $diffMinutes minutes\n";
        
        if ($diffMinutes >= 9 && $diffMinutes <= 11) {
            echo "✅ OTP timing is now CORRECT!\n";
        } else {
            echo "❌ OTP timing is still incorrect\n";
        }
    } else {
        echo "❌ Record not found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
