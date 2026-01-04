<?php
// Load Composer autoloader for PHPMailer
require_once 'vendor/autoload.php';
require_once '../config/database.php';
require_once '../utils/auth.php';

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

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Handle routing
$request_method = $_SERVER['REQUEST_METHOD'];
$path_info = $_SERVER['PATH_INFO'] ?? '';

// Parse the path to extract member ID and action
$path_parts = explode('/', trim($path_info, '/'));

switch ($request_method) {
    case 'GET':
        if ($path_info === '/search') {
            handleSearchMembers();
        } elseif (count($path_parts) >= 2 && $path_parts[1] === 'email') {
            $memberId = $path_parts[0];
            handleGetMemberEmail($memberId);
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    case 'POST':
        if (count($path_parts) >= 2) {
            $memberId = $path_parts[0];
            $action = $path_parts[1];
            
            switch ($action) {
                case 'send-otp':
                    handleSendOTP($memberId);
                    break;
                case 'verify-otp':
                    handleVerifyOTP($memberId);
                    break;
                case 'reset-password':
                    handleResetPassword($memberId);
                    break;
                case 'update-email':
                    handleUpdateEmail($memberId);
                    break;
                default:
                    ApiResponse::error('Endpoint not found', 404);
            }
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleSearchMembers() {
    $name = $_GET['name'] ?? '';
    
    if (empty($name)) {
        ApiResponse::error('Name required');
    }

    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("
            SELECT id, first_name, last_name 
            FROM members 
            WHERE first_name LIKE ? OR last_name LIKE ? 
            LIMIT 10
        ");
        $searchTerm = "%$name%";
        $stmt->execute([$searchTerm, $searchTerm]);
        $members = $stmt->fetchAll();

        ApiResponse::success(['members' => $members]);

    } catch (Exception $e) {
        error_log("Search members error: " . $e->getMessage());
        ApiResponse::error('Error searching members', 500);
    }
}

function handleGetMemberEmail($memberId) {
    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("SELECT users.email, members.id FROM users INNER JOIN members ON members.user_id = users.id WHERE members.id = ?");

        error_log("Query: " . $stmt->queryString);
        error_log("Member ID: " . $memberId);
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member) {
            ApiResponse::error('Member not found', 404);
        }

        ApiResponse::success(['email' => $member['email']]);

    } catch (Exception $e) {
        error_log("Get member email error: " . $e->getMessage());
        ApiResponse::error('Error fetching member email', 500);
    }
}

function handleSendOTP($memberId) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // error_log($input);
    // error_log($memberId);
    try {
        $pdo = getDbConnection();

        // Determine target email according to requested logic:
        // 1) If input email exists in users table, use it directly
        // 2) If input email does not exist, update current user's email to input then use it
        // 3) If no input email, fallback to existing email for this member

        $email = null;
        $inputEmail = null;
        if ($input && isset($input['email'])) {
            $inputEmail = trim($input['email']);
        }
        // error_log(json_encode($input, JSON_PRETTY_PRINT));

        // error_log("Input Email: " . json_encode($inputEmail, JSON_PRETTY_PRINT));
        // // If an email was provided, validate format first (optional but safer)
        if ($inputEmail) {
            if (class_exists('Validator') && !Validator::validateEmail($inputEmail)) {
                ApiResponse::error('Invalid email format');
            }
            // Use provided email ONLY for sending OTP. Do not persist here.
            $email = $inputEmail;
            error_log("[send-otp] Using provided email for OTP (not saving): " . $email);
        }

        if (!$email) {
            // No input email provided, fallback to member's existing email
            $stmt = $pdo->prepare("SELECT users.email, members.id FROM users INNER JOIN members ON members.user_id = users.id WHERE members.id = ?");
            $stmt->execute([$memberId]);
            $member = $stmt->fetch();

            $email = ($member && $member['email']) ? $member['email'] : null;
            error_log("[send-otp] Fallback member email: " . var_export($email, true));
        }

        if (!$email) {
            ApiResponse::error('Email not found', 404);
        }
        error_log("[send-otp] Final email to send OTP: " . $email);

        // Generate OTP
        $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Save OTP using DB time to avoid timezone drift: created_at = NOW(), expires_at = NOW() + 10 minutes
        $stmt = $pdo->prepare("
            INSERT INTO password_resets (member_id, otp, expires_at, created_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())
        ");
        $okInsert = $stmt->execute([$memberId, $otp]);
        error_log("[send-otp] Insert password_resets ok? " . ($okInsert ? 'true' : 'false'));

        // Send email using PHPMailer
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

            // Recipients
            $mail->setFrom($_ENV['SMTP_USER'] ?? 'no-reply@ifeloduncms.com.ng', 'Ifelodun Cooperative');
            $mail->addAddress($email);
            $mail->addCC('bankole.adesoji@gmil.com');

            // Content
            $mail->isHTML(true);
            $mail->Subject = 'Your OTP Code';
            $mail->Body    = getOTPEmailTemplate($otp);
            $mail->AltBody = "Your OTP code is: $otp. This code expires in 10 minutes.";

            $mail->send();
            ApiResponse::success(['message' => 'OTP sent successfully to your email']);
        } catch (Exception $e) {
            error_log("PHPMailer Error: " . $mail->ErrorInfo);
            ApiResponse::error('Failed to send OTP email: ' . $mail->ErrorInfo, 500);
        }

    } catch (Exception $e) {
        error_log("Send OTP error: " . $e->getMessage());
        ApiResponse::error('Failed to send OTP', 500);
    }
}

function handleVerifyOTP($memberId) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['otp'])) {
        ApiResponse::error('OTP required');
    }

    $otp = $input['otp'];

    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("
            SELECT * FROM password_resets 
            WHERE member_id = ? AND otp = ? AND used = 0 AND expires_at > NOW() 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$memberId, $otp]);
        $row = $stmt->fetch();

        if (!$row) {
            ApiResponse::error('Invalid or expired OTP');
        }

        ApiResponse::success(['message' => 'OTP valid']);

    } catch (Exception $e) {
        error_log("Verify OTP error: " . $e->getMessage());
        ApiResponse::error('Error verifying OTP', 500);
    }
}

function handleResetPassword($memberId) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['otp']) || !isset($input['password'])) {
        ApiResponse::error('OTP and password required');
    }

    $otp = $input['otp'];
    $password = $input['password'];

    try {
        $pdo = getDbConnection();
        
        // Check OTP
        $stmt = $pdo->prepare("
            SELECT * FROM password_resets 
            WHERE member_id = ? AND otp = ? AND used = 0 AND expires_at > NOW() 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$memberId, $otp]);
        $row = $stmt->fetch();

        if (!$row) {
            ApiResponse::error('Invalid or expired OTP');
        }

        // Get user_id from members table
        $stmt = $pdo->prepare("SELECT user_id FROM members WHERE id = ?");
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member || !$member['user_id']) {
            ApiResponse::error('User not found', 404);
        }

        // Hash new password
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        // Update password in users table
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$hashedPassword, $member['user_id']]);

        // Mark OTP as used
        $stmt = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
        $stmt->execute([$row['id']]);

        ApiResponse::success(['message' => 'Password reset successful']);

    } catch (Exception $e) {
        error_log("Reset password error: " . $e->getMessage());
        ApiResponse::error('Error resetting password', 500);
    }
}

function handleUpdateEmail($memberId) {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['email'])) {
        ApiResponse::error('Email required');
    }

    $email = trim($input['email']);

    // Validate email format
    if (!Validator::validateEmail($email)) {
        ApiResponse::error('Invalid email format');
    }

    try {
        $pdo = getDbConnection();
        
        // Get user_id from members table
        $stmt = $pdo->prepare("SELECT user_id FROM members WHERE id = ?");
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member || !$member['user_id']) {
            ApiResponse::error('User not found', 404);
        }

        // Check if email is already in use in users table
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $member['user_id']]);
        $existingUser = $stmt->fetch();

        if ($existingUser) {
            ApiResponse::error('Email already in use');
        }

        // Update email in users table
        $stmt = $pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        $stmt->execute([$email, $member['user_id']]);

        error_log("Query: " . $stmt->queryString);
        error_log("Email: " . $email);
        error_log("User ID: " . $member['user_id']);

        // Update email in members table
        // $stmt = $pdo->prepare("UPDATE members SET email = ? WHERE id = ?");
        // $stmt->execute([$email, $memberId]);

        ApiResponse::success(['message' => 'Email updated successfully']);

    } catch (Exception $e) {
        error_log("Update email error: " . $e->getMessage());
        ApiResponse::error('Server error', 500);
    }
}

function getOTPEmailTemplate($otp) {
    return "
    <!DOCTYPE html>
    <html lang=\"en\">
    <head>
      <meta charset=\"UTF-8\">
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
      <title>Your OTP Code</title>
    </head>
    <body style=\"margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;\">
      <table role=\"presentation\" width=\"100%\" style=\"max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">
        <tr>
          <td style=\"background-color: #2c3e50; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;\">
            <h1 style=\"color: #ffffff; margin: 0; font-size: 24px;\">Ifelodun Cooperative</h1>
          </td>
        </tr>
        <tr>
          <td style=\"padding: 30px; text-align: center;\">
            <h2 style=\"color: #2c3e50; font-size: 20px; margin: 0 0 20px;\">Your One-Time Password (OTP)</h2>
            <p style=\"color: #333333; font-size: 16px; margin: 0 0 20px;\">Use the following OTP to complete your email update process. This code expires in 10 minutes.</p>
            <div style=\"background-color: #e8f0fe; padding: 15px; border-radius: 6px; display: inline-block;\">
              <span style=\"font-size: 24px; font-weight: bold; color: #1a73e8; letter-spacing: 2px;\">$otp</span>
            </div>
            <p style=\"color: #666666; font-size: 14px; margin: 20px 0 0;\">For security, do not share this OTP with anyone.</p>
          </td>
        </tr>
        <tr>
          <td style=\"background-color: #f4f4f4; padding: 20px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;\">
            <p style=\"color: #666666; font-size: 12px; margin: 0;\">&copy; 2025 Ifelodun Cooperative. All rights reserved.</p>
            <p style=\"color: #666666; font-size: 12px; margin: 5px 0 0;\">
              <a href=\"https://ifeloduncms.com.ng\" style=\"color: #1a73e8; text-decoration: none;\">Visit our website</a> | 
              <a href=\"mailto:support@ifeloduncms.com.ng\" style=\"color: #1a73e8; text-decoration: none;\">Contact Support</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    ";
}
?>