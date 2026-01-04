<?php
// Require utils/auth.php which contains ApiResponse class
require_once __DIR__ . '/utils/auth.php';

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Automation-ready: precedence ENV > app_version.json > static defaults
// 1) From ENV (set by CI, e.g., APP_VERSION, APP_MIN_VERSION, APP_APK_URL, APP_CHECKSUM, APP_NOTES)
$envVersion    = $_ENV['APP_VERSION']      ?? getenv('APP_VERSION')      ?: null;
$envMinVersion = $_ENV['APP_MIN_VERSION']  ?? getenv('APP_MIN_VERSION')  ?: null;
$envUrl        = $_ENV['APP_APK_URL']      ?? getenv('APP_APK_URL')      ?: null;
$envChecksum   = $_ENV['APP_CHECKSUM']     ?? getenv('APP_CHECKSUM')     ?: null;
$envNotes      = $_ENV['APP_NOTES']        ?? getenv('APP_NOTES')        ?: null;

// 2) From JSON file (produced by CI): app_version.json (same directory)
$jsonData = null;
$jsonPath = realpath(__DIR__ . '/app_version.json');
if ($jsonPath && file_exists($jsonPath)) {
    $raw = file_get_contents($jsonPath);
    $parsed = json_decode($raw, true);
    if (is_array($parsed)) {
        $jsonData = $parsed;
    }
}

// 3) Static defaults (fallback)
$defaults = [
    'version' => '1.0.1',
    'min_version' => '1.0.0',
    'url' => 'https://ifeloduncms.com.ng/downloads/ifelodun-1.0.1.apk',
    'checksum' => null,
    'notes' => 'Bug fixes and performance improvements.'
];

// Merge with precedence
$versionInfo = [
    'version'     => $envVersion    ?? ($jsonData['version']     ?? $defaults['version']),
    'min_version' => $envMinVersion ?? ($jsonData['min_version'] ?? $defaults['min_version']),
    'url'         => $envUrl        ?? ($jsonData['url']         ?? $defaults['url']),
    'checksum'    => $envChecksum   ?? ($jsonData['checksum']    ?? $defaults['checksum']),
    'notes'       => $envNotes      ?? ($jsonData['notes']       ?? $defaults['notes']),
];

ApiResponse::success($versionInfo);
?>