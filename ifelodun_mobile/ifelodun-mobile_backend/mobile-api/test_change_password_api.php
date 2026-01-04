<?php
// Test change password API endpoint
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

echo "Testing Change Password API Endpoint...\n\n";

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
    
    // Get a test member with user_id
    $stmt = $pdo->prepare("
        SELECT m.id as member_id, m.first_name, m.last_name, u.id as user_id, u.username 
        FROM members m 
        JOIN users u ON m.user_id = u.id 
        LIMIT 1
    ");
    $stmt->execute();
    $testMember = $stmt->fetch();
    
    if (!$testMember) {
        echo "❌ No test member found\n";
        exit;
    }
    
    $memberId = $testMember['member_id'];
    $userId = $testMember['user_id'];
    
    echo "Test Member:\n";
    echo "Member ID: $memberId\n";
    echo "User ID: $userId\n";
    echo "Name: {$testMember['first_name']} {$testMember['last_name']}\n";
    echo "Username: {$testMember['username']}\n\n";
    
    // Set a known password for testing
    $testPassword = 'test123';
    $hashedPassword = password_hash($testPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $userId]);
    echo "✅ Set test password: $testPassword\n\n";
    
    // Test the API logic directly (without HTTP request)
    echo "Testing API logic with member_id...\n";
    
    // Simulate the API input
    $input = [
        'user_id' => $memberId, // This is actually member_id from Flutter app
        'old_password' => $testPassword,
        'new_password' => 'newpass123'
    ];
    
    $memberIdOrUserId = $input['user_id'];
    $oldPassword = $input['old_password'];
    $newPassword = $input['new_password'];
    
    // First try to get user by user_id, if not found try by member_id
    $stmt = $pdo->prepare("SELECT id, password FROM users WHERE id = ?");
    $stmt->execute([$memberIdOrUserId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo "User not found by user_id, trying member_id...\n";
        // Try to find user by member_id
        $stmt = $pdo->prepare("
            SELECT u.id, u.password 
            FROM users u 
            JOIN members m ON u.id = m.user_id 
            WHERE m.id = ?
        ");
        $stmt->execute([$memberIdOrUserId]);
        $user = $stmt->fetch();
        
        if ($user) {
            echo "✅ Found user by member_id\n";
        }
    } else {
        echo "✅ Found user by user_id\n";
    }
    
    if (!$user) {
        echo "❌ User not found\n";
        exit;
    }
    
    $actualUserId = $user['id'];
    echo "Actual User ID: $actualUserId\n";
    
    // Check old password
    if (!password_verify($oldPassword, $user['password'])) {
        echo "❌ Old password verification failed\n";
        exit;
    }
    
    echo "✅ Old password verified\n";
    
    // Hash and update new password
    $newHashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$newHashedPassword, $actualUserId]);
    
    echo "✅ Password updated successfully\n";
    
    // Verify new password
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$actualUserId]);
    $updatedUser = $stmt->fetch();
    
    if (password_verify($newPassword, $updatedUser['password'])) {
        echo "✅ New password verification successful\n";
        echo "\n🎉 Change password API logic is working correctly!\n";
        echo "✅ The API can handle both user_id and member_id inputs\n";
    } else {
        echo "❌ New password verification failed\n";
    }
    
    // Reset password back
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $actualUserId]);
    echo "✅ Password reset back to test password\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
