<?php
// Test timezone and time calculations
echo "Testing Timezone and Time Calculations...\n\n";

// Show current PHP timezone
echo "PHP Timezone: " . date_default_timezone_get() . "\n";
echo "PHP Current Time: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Unix Timestamp: " . time() . "\n\n";

// Test OTP expiration calculation
$currentTime = time();
$expirationTime = $currentTime + (10 * 60); // 10 minutes
$expiresAt = date('Y-m-d H:i:s', $expirationTime);

echo "OTP Expiration Calculation:\n";
echo "Current Time: " . date('Y-m-d H:i:s', $currentTime) . "\n";
echo "Expiration Time (+10 min): " . date('Y-m-d H:i:s', $expirationTime) . "\n";
echo "Expires At String: $expiresAt\n\n";

// Test database timezone
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
    
    // Check database timezone
    $stmt = $pdo->query("SELECT NOW() as db_time, @@session.time_zone as session_tz, @@global.time_zone as global_tz");
    $result = $stmt->fetch();
    
    echo "Database Information:\n";
    echo "Database Current Time: " . $result['db_time'] . "\n";
    echo "Session Timezone: " . $result['session_tz'] . "\n";
    echo "Global Timezone: " . $result['global_tz'] . "\n\n";
    
    // Check the specific OTP record
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = 148 ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $otp = $stmt->fetch();
    
    if ($otp) {
        echo "Latest OTP Record for Member 148:\n";
        echo "ID: " . $otp['id'] . "\n";
        echo "OTP: " . $otp['otp'] . "\n";
        echo "Created: " . $otp['created_at'] . "\n";
        echo "Expires: " . $otp['expires_at'] . "\n";
        echo "Used: " . $otp['used'] . "\n\n";
        
        // Calculate time difference
        $created = strtotime($otp['created_at']);
        $expires = strtotime($otp['expires_at']);
        $diffMinutes = ($expires - $created) / 60;
        
        echo "Time Difference: $diffMinutes minutes\n";
        
        if ($diffMinutes == 10) {
            echo "✅ Expiration time is correct (10 minutes)\n";
        } else {
            echo "❌ Expiration time is incorrect (should be 10 minutes, got $diffMinutes minutes)\n";
        }
        
        // Check if OTP is still valid
        $stmt = $pdo->query("SELECT NOW() as current_time");
        $current = $stmt->fetch();
        
        echo "\nOTP Validity Check:\n";
        echo "Current DB Time: " . $current['current_time'] . "\n";
        echo "OTP Expires At: " . $otp['expires_at'] . "\n";
        
        if ($current['current_time'] < $otp['expires_at']) {
            echo "✅ OTP is still valid\n";
        } else {
            echo "❌ OTP has expired\n";
        }
    } else {
        echo "No OTP records found for member 148\n";
    }
    
} catch (Exception $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
}

// Test with different timezone settings
echo "\nTesting with UTC timezone:\n";
date_default_timezone_set('UTC');
echo "UTC Time: " . date('Y-m-d H:i:s') . "\n";
echo "UTC +10 min: " . date('Y-m-d H:i:s', time() + (10 * 60)) . "\n";

echo "\nTesting with Africa/Lagos timezone:\n";
date_default_timezone_set('Africa/Lagos');
echo "Lagos Time: " . date('Y-m-d H:i:s') . "\n";
echo "Lagos +10 min: " . date('Y-m-d H:i:s', time() + (10 * 60)) . "\n";
?>
