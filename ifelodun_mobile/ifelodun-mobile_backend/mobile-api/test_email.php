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
echo "SMTP Configuration:\n";
echo "Host: " . ($_ENV['SMTP_HOST'] ?? 'Not set') . "\n";
echo "Port: " . ($_ENV['SMTP_PORT'] ?? 'Not set') . "\n";
echo "User: " . ($_ENV['SMTP_USER'] ?? 'Not set') . "\n";
echo "Pass: " . (isset($_ENV['SMTP_PASS']) ? str_repeat('*', strlen($_ENV['SMTP_PASS'])) : 'Not set') . "\n\n";

// Test email sending
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
    
    // Enable verbose debug output
    $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    $mail->Debugoutput = 'echo';

    // Recipients
    $mail->setFrom($_ENV['SMTP_USER'] ?? 'no-reply@ifeloduncms.com.ng', 'Ifelodun Cooperative Society');
    $mail->addAddress('bankole.adesoji@gmail.com', 'Test User'); // Change this to a real email for testing

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'PHPMailer Test Email';
    $mail->Body    = '<h1>Test Email</h1><p>This is a test email to verify PHPMailer configuration.</p>';

    echo "Attempting to send test email...\n";
    $mail->send();
    echo "\n✅ Test email sent successfully!\n";
    
} catch (Exception $e) {
    echo "\n❌ Email sending failed: {$mail->ErrorInfo}\n";
    echo "Exception: " . $e->getMessage() . "\n";
}
?>
