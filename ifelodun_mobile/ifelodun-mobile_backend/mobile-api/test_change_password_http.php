<?php
// Test change password via HTTP request
echo "Testing Change Password HTTP Endpoint...\n\n";

// Test data
$testData = [
    'user_id' => '125', // This is member_id from our test
    'old_password' => 'test123',
    'new_password' => 'newpass123'
];

echo "Test Data:\n";
echo "User ID (member_id): {$testData['user_id']}\n";
echo "Old Password: {$testData['old_password']}\n";
echo "New Password: {$testData['new_password']}\n\n";

// Make HTTP request to change password endpoint
$url = 'http://ifeloduncms.com.ng/mobile_app2/mobile-api/change-password';
$data = json_encode($testData);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

echo "Making HTTP request to: $url\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";

if ($error) {
    echo "❌ cURL Error: $error\n";
} else {
    echo "Response: $response\n\n";
    
    $responseData = json_decode($response, true);
    
    if ($httpCode == 200 && isset($responseData['message'])) {
        echo "✅ Password change successful!\n";
        echo "Message: {$responseData['message']}\n";
    } else {
        echo "❌ Password change failed\n";
        if (isset($responseData['error'])) {
            echo "Error: {$responseData['error']}\n";
        }
    }
}

echo "\n";

// Test with wrong old password
echo "Testing with wrong old password...\n";
$wrongData = [
    'user_id' => '125',
    'old_password' => 'wrongpassword',
    'new_password' => 'newpass123'
];

$data = json_encode($wrongData);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response: $response\n";

$responseData = json_decode($response, true);
if (isset($responseData['error']) && strpos($responseData['error'], 'password') !== false) {
    echo "✅ Correctly rejected wrong old password\n";
} else {
    echo "❌ Should have rejected wrong old password\n";
}
?>
