<?php
// Test PHPMailer configuration
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

echo "Testing PHPMailer Configuration...\n\n";

// Display configuration
echo "SMTP Host: " . ($_ENV['SMTP_HOST'] ?? 'Not set') . "\n";
echo "SMTP Port: " . ($_ENV['SMTP_PORT'] ?? 'Not set') . "\n";
echo "SMTP User: " . ($_ENV['SMTP_USER'] ?? 'Not set') . "\n";
echo "SMTP Pass: " . (isset($_ENV['SMTP_PASS']) ? '***' . substr($_ENV['SMTP_PASS'], -4) : 'Not set') . "\n\n";

// Get test email address
if ($argc < 2) {
    echo "Usage: php test_email_config.php <test_email_address>\n";
    echo "Example: php test_email_config.php test@example.com\n";
    exit(1);
}

$testEmail = $argv[1];
echo "Sending test email to: $testEmail\n\n";

$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = $_ENV['SMTP_HOST'] ?? 'mail.ifeloduncms.com.ng';
    $mail->SMTPAuth   = true;
    $mail->Username   = $_ENV['SMTP_USER'] ?? 'no-reply@ifeloduncms.com.ng';
    $mail->Password   = $_ENV['SMTP_PASS'] ?? '';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = $_ENV['SMTP_PORT'] ?? 465;
    
    // Enable verbose debug output (optional)
    // $mail->SMTPDebug = SMTP::DEBUG_SERVER;

    // Recipients
    $mail->setFrom($_ENV['SMTP_USER'] ?? 'no-reply@ifeloduncms.com.ng', 'Ifelodun Cooperative');
    $mail->addAddress($testEmail);

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'PHPMailer Test Email';
    $mail->Body    = '<h1>Test Email</h1><p>This is a test email to verify PHPMailer configuration.</p><p>If you received this email, your PHPMailer configuration is working correctly! ✅</p>';
    $mail->AltBody = 'This is a test email to verify PHPMailer configuration. If you received this email, your PHPMailer configuration is working correctly!';

    $mail->send();
    echo "✅ SUCCESS! Test email sent successfully.\n";
    echo "Check the inbox (and spam folder) of $testEmail\n";
} catch (Exception $e) {
    echo "❌ ERROR: Could not send test email.\n";
    echo "Error: {$mail->ErrorInfo}\n";
    exit(1);
}

