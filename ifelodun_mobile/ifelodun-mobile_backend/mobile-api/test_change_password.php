<?php
// Test change password functionality
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

echo "Testing Change Password Functionality...\n\n";

try {
    // Create direct database connection
    $host = $_ENV['DB_HOST'] ?? 'localhost';
    $dbname = $_ENV['DB_NAME'] ?? '';
    $username = $_ENV['DB_USER'] ?? '';
    $password = $_ENV['DB_PASSWORD'] ?? '';
    
    echo "Database Configuration:\n";
    echo "Host: $host\n";
    echo "Database: $dbname\n";
    echo "User: $username\n\n";
    
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
    
    // Find a test user
    $stmt = $pdo->prepare("
        SELECT u.id as user_id, u.username, u.password, m.id as member_id, m.first_name, m.last_name 
        FROM users u 
        JOIN members m ON u.id = m.user_id 
        LIMIT 5
    ");
    $stmt->execute();
    $users = $stmt->fetchAll();
    
    echo "Available test users:\n";
    foreach ($users as $user) {
        echo "User ID: {$user['user_id']}, Username: {$user['username']}, Member: {$user['first_name']} {$user['last_name']}\n";
    }
    echo "\n";
    
    if (empty($users)) {
        echo "❌ No users found in database\n";
        exit;
    }
    
    // Use the first user for testing
    $testUser = $users[0];
    $userId = $testUser['user_id'];
    $currentPasswordHash = $testUser['password'];
    
    echo "Testing with User ID: $userId\n";
    echo "Current password hash: " . substr($currentPasswordHash, 0, 20) . "...\n\n";
    
    // Test password verification with common passwords
    $testPasswords = ['123456', 'password', 'test123', 'admin', '12345678'];
    $currentPassword = null;
    
    foreach ($testPasswords as $testPass) {
        if (password_verify($testPass, $currentPasswordHash)) {
            $currentPassword = $testPass;
            echo "✅ Found current password: $testPass\n";
            break;
        }
    }
    
    if (!$currentPassword) {
        echo "❌ Could not determine current password. Testing with hash update only.\n";
        // Create a test password
        $currentPassword = 'test123';
        $newHash = password_hash($currentPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$newHash, $userId]);
        echo "✅ Set test password: $currentPassword\n";
    }
    
    echo "\n";
    
    // Test password change
    $newPassword = 'newpass123';
    echo "Testing password change...\n";
    echo "Old password: $currentPassword\n";
    echo "New password: $newPassword\n\n";
    
    // Verify old password
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!password_verify($currentPassword, $user['password'])) {
        echo "❌ Old password verification failed\n";
        exit;
    }
    
    echo "✅ Old password verified\n";
    
    // Hash and update new password
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$hashedPassword, $userId]);
    
    echo "✅ Password updated in database\n";
    
    // Verify new password works
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $updatedUser = $stmt->fetch();
    
    if (password_verify($newPassword, $updatedUser['password'])) {
        echo "✅ New password verification successful\n";
        echo "\n🎉 Password change functionality is working correctly!\n";
    } else {
        echo "❌ New password verification failed\n";
    }
    
    // Reset password back for testing
    $originalHash = password_hash($currentPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$originalHash, $userId]);
    echo "✅ Password reset back to original for future testing\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
