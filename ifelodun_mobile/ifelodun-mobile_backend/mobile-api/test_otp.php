<?php
// Test OTP sending functionality
require_once 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

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

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

echo "Testing OTP sending functionality...\n\n";

try {
    // Test database connection
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
    
    // Test member lookup
    $memberId = 148;
    $stmt = $pdo->prepare("SELECT email, first_name, last_name FROM members WHERE id = ?");
    $stmt->execute([$memberId]);
    $member = $stmt->fetch();
    
    if ($member) {
        echo "✅ Member found:\n";
        echo "Name: " . ($member['first_name'] ?? '') . " " . ($member['last_name'] ?? '') . "\n";
        echo "Email: " . ($member['email'] ?? 'No email') . "\n\n";
    } else {
        echo "❌ Member not found\n\n";
    }
    
    // Generate OTP
    $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', time() + (10 * 60)); // 10 minutes
    
    echo "Generated OTP: $otp\n";
    echo "Expires at: $expiresAt\n\n";
    
    // Test OTP storage
    $stmt = $pdo->prepare("
        INSERT INTO password_resets (member_id, otp, expires_at) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)
    ");
    $stmt->execute([$memberId, $otp, $expiresAt]);
    
    echo "✅ OTP stored in database\n\n";
    
    // Test email sending
    $email = 'bankole.adesoji@gmail.com';
    $mail = new PHPMailer(true);
    
    // Server settings
    $mail->isSMTP();
    $mail->Host = $_ENV['SMTP_HOST'] ?? 'mail.ifeloduncms.com.ng';
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USER'] ?? 'no-reply@ifeloduncms.com.ng';
    $mail->Password = $_ENV['SMTP_PASS'] ?? '';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = $_ENV['SMTP_PORT'] ?? 465;
    
    // Recipients
    $mail->setFrom($_ENV['SMTP_USER'] ?? 'no-reply@ifeloduncms.com.ng', 'Ifelodun Cooperative Society');
    $mail->addAddress($email, ($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
    
    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Your Password Reset OTP Code - Test';
    $mail->Body = "<h1>Test OTP: $otp</h1><p>This is a test OTP email.</p>";
    
    $mail->send();
    
    echo "✅ OTP email sent successfully to $email\n\n";
    echo "All tests passed! OTP functionality is working.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
