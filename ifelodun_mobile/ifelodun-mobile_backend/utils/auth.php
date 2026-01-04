<?php
require_once 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthUtils {
    private static $jwt_secret;

    public static function init() {
        self::$jwt_secret = $_ENV['JWT_SECRET'] ?? 'your-secret-key';
    }

    public static function generateToken($payload) {
        self::init();
        $issuedAt = time();
        $expirationTime = $issuedAt + (60 * 60); // 1 hour
        
        $token_payload = array_merge($payload, [
            'iat' => $issuedAt,
            'exp' => $expirationTime
        ]);

        return JWT::encode($token_payload, self::$jwt_secret, 'HS256');
    }

    public static function verifyToken($token) {
        self::init();
        try {
            $decoded = JWT::decode($token, new Key(self::$jwt_secret, 'HS256'));
            return (array) $decoded;
        } catch (Exception $e) {
            return false;
        }
    }

    public static function authenticateToken() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode(['error' => 'Token required']);
            exit;
        }

        $token = str_replace('Bearer ', '', $authHeader);
        $decoded = self::verifyToken($token);
        
        if (!$decoded) {
            http_response_code(403);
            echo json_encode(['error' => 'Invalid token']);
            exit;
        }

        return $decoded;
    }

    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
}

class ApiResponse {
    public static function json($data, $status_code = 200) {
        http_response_code($status_code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    public static function error($message, $status_code = 400) {
        self::json(['error' => $message], $status_code);
    }

    public static function success($data, $message = null) {
        $response = $data;
        if ($message) {
            $response['message'] = $message;
        }
        self::json($response);
    }
}

class Validator {
    public static function validateRequired($data, $required_fields) {
        $errors = [];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $errors[] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
            }
        }
        return $errors;
    }

    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function validateMinLength($value, $min_length) {
        return strlen(trim($value)) >= $min_length;
    }
}
?>
