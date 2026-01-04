<?php
// Test complete forgot password flow
echo "Testing Complete Forgot Password Flow...\n\n";

$memberId = 148;
$email = 'bankole.adesoji@gmail.com';

echo "=== STEP 1: Send OTP ===\n";
$sendData = json_encode(['email' => $email]);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/send-otp");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $sendData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$sendResponse = curl_exec($ch);
$sendHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Send OTP Response (HTTP $sendHttpCode): $sendResponse\n\n";

if ($sendHttpCode != 200) {
    echo "❌ Failed to send OTP, stopping test\n";
    exit;
}

// Get the actual OTP from database
echo "=== Getting OTP from Database ===\n";
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
    
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE member_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$memberId]);
    $otpRecord = $stmt->fetch();
    
    if (!$otpRecord) {
        echo "❌ No OTP record found in database\n";
        exit;
    }
    
    $correctOtp = $otpRecord['otp'];
    echo "Correct OTP from database: $correctOtp\n";
    echo "Expires at: " . $otpRecord['expires_at'] . "\n\n";
    
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit;
}

echo "=== STEP 2: Test Wrong OTP ===\n";
$wrongOtp = '123456';
$verifyData = json_encode(['otp' => $wrongOtp]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/verify-otp");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $verifyData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$wrongResponse = curl_exec($ch);
$wrongHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Wrong OTP ($wrongOtp) Response (HTTP $wrongHttpCode): $wrongResponse\n";

if ($wrongHttpCode == 200) {
    echo "❌ SECURITY ISSUE: Wrong OTP was accepted!\n";
} else {
    echo "✅ Wrong OTP correctly rejected\n";
}

echo "\n=== STEP 3: Test Correct OTP ===\n";
$verifyData = json_encode(['otp' => $correctOtp]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/verify-otp");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $verifyData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$correctResponse = curl_exec($ch);
$correctHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Correct OTP ($correctOtp) Response (HTTP $correctHttpCode): $correctResponse\n";

if ($correctHttpCode == 200) {
    echo "✅ Correct OTP accepted\n";
} else {
    echo "❌ Correct OTP was rejected\n";
}

echo "\n=== STEP 4: Test Password Reset ===\n";
$newPassword = 'newpass123';
$resetData = json_encode([
    'otp' => $correctOtp,
    'password' => $newPassword
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://ifeloduncms.com.ng/mobile_app2/mobile-api/forgot-password/$memberId/reset-password");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $resetData);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$resetResponse = curl_exec($ch);
$resetHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Password Reset Response (HTTP $resetHttpCode): $resetResponse\n";

if ($resetHttpCode == 200) {
    echo "✅ Password reset successful\n";
} else {
    echo "❌ Password reset failed\n";
}

echo "\n=== SUMMARY ===\n";
echo "Send OTP: " . ($sendHttpCode == 200 ? "✅ Success" : "❌ Failed") . "\n";
echo "Wrong OTP: " . ($wrongHttpCode != 200 ? "✅ Correctly rejected" : "❌ SECURITY ISSUE") . "\n";
echo "Correct OTP: " . ($correctHttpCode == 200 ? "✅ Accepted" : "❌ Rejected") . "\n";
echo "Password Reset: " . ($resetHttpCode == 200 ? "✅ Success" : "❌ Failed") . "\n";
?>
