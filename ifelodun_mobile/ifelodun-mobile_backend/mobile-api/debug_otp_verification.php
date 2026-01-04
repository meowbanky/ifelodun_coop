<?php
// Debug OTP verification
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
    
    echo "Debugging OTP verification...\n\n";
    
    $memberId = 148;
    $testOtp = '261478'; // The current correct OTP
    
    echo "Testing with:\n";
    echo "Member ID: $memberId\n";
    echo "OTP: $testOtp\n\n";
    
    // Test the exact query from the API
    echo "1. Testing the verification query:\n";
    $stmt = $pdo->prepare("
        SELECT * FROM password_resets 
        WHERE member_id = ? AND otp = ? AND used = 0 AND expires_at > NOW() 
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $stmt->execute([$memberId, $testOtp]);
    $row = $stmt->fetch();
    
    if ($row) {
        echo "✅ OTP verification query found a match!\n";
        echo "Record details:\n";
        echo "ID: " . $row['id'] . "\n";
        echo "Member ID: " . $row['member_id'] . "\n";
        echo "OTP: " . $row['otp'] . "\n";
        echo "Created: " . $row['created_at'] . "\n";
        echo "Expires: " . $row['expires_at'] . "\n";
        echo "Used: " . ($row['used'] ? 'Yes' : 'No') . "\n\n";
    } else {
        echo "❌ OTP verification query found NO match\n\n";
        
        // Debug each condition separately
        echo "Debugging each condition:\n";
        
        // Check member_id
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = ?");
        $stmt->execute([$memberId]);
        $memberCheck = $stmt->fetchAll();
        echo "Records for member $memberId: " . count($memberCheck) . "\n";
        
        // Check OTP
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE otp = ?");
        $stmt->execute([$testOtp]);
        $otpCheck = $stmt->fetchAll();
        echo "Records with OTP $testOtp: " . count($otpCheck) . "\n";
        
        // Check used = 0
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = ? AND used = 0");
        $stmt->execute([$memberId]);
        $usedCheck = $stmt->fetchAll();
        echo "Unused records for member $memberId: " . count($usedCheck) . "\n";
        
        // Check expiration
        $stmt = $pdo->prepare("SELECT *, NOW() as current_time FROM password_resets WHERE member_id = ?");
        $stmt->execute([$memberId]);
        $expireCheck = $stmt->fetchAll();
        echo "Expiration check for member $memberId:\n";
        foreach ($expireCheck as $record) {
            echo "  OTP: {$record['otp']}, Expires: {$record['expires_at']}, Current: {$record['current_time']}, Valid: " . 
                 ($record['expires_at'] > $record['current_time'] ? 'Yes' : 'No') . "\n";
        }
        
        // Check the complete record
        echo "\nComplete record for member $memberId:\n";
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$memberId]);
        $completeRecord = $stmt->fetch();
        if ($completeRecord) {
            echo "ID: " . $completeRecord['id'] . "\n";
            echo "Member ID: " . $completeRecord['member_id'] . "\n";
            echo "OTP: '" . $completeRecord['otp'] . "' (length: " . strlen($completeRecord['otp']) . ")\n";
            echo "Test OTP: '$testOtp' (length: " . strlen($testOtp) . ")\n";
            echo "OTP Match: " . ($completeRecord['otp'] === $testOtp ? 'Yes' : 'No') . "\n";
            echo "Created: " . $completeRecord['created_at'] . "\n";
            echo "Expires: " . $completeRecord['expires_at'] . "\n";
            echo "Used: " . ($completeRecord['used'] ? 'Yes' : 'No') . "\n";
        }
    }
    
    // Test with wrong OTP
    echo "\n2. Testing with wrong OTP (123456):\n";
    $wrongOtp = '123456';
    $stmt = $pdo->prepare("
        SELECT * FROM password_resets 
        WHERE member_id = ? AND otp = ? AND used = 0 AND expires_at > NOW() 
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $stmt->execute([$memberId, $wrongOtp]);
    $wrongRow = $stmt->fetch();
    
    if ($wrongRow) {
        echo "❌ SECURITY ISSUE: Wrong OTP was accepted!\n";
    } else {
        echo "✅ Wrong OTP correctly rejected\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
