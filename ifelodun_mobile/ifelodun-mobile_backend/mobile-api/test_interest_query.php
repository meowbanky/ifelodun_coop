<?php
// Test the improved interest calculation query
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

echo "Testing Interest Calculation Query...\n\n";

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
    
    echo "✅ Database connection successful\n\n";
    
    // Test with a sample member ID
    $testMemberId = 148;
    
    echo "Testing with Member ID: $testMemberId\n\n";
    
    // Test the OLD query (subqueries)
    echo "=== OLD Query (Subqueries) ===\n";
    $stmt = $pdo->prepare("
        SELECT 
            (COALESCE((SELECT SUM(amount) FROM interest_charged WHERE member_id = ?), 0) -
             COALESCE((SELECT SUM(amount) FROM interest_paid WHERE member_id = ?), 0)
            ) AS unpaid_interest
    ");
    $stmt->execute([$testMemberId, $testMemberId]);
    $oldResult = $stmt->fetch();
    echo "Old Query Result: " . $oldResult['unpaid_interest'] . "\n\n";
    
    // Test the NEW query (JOINs with GROUP BY)
    echo "=== NEW Query (JOINs with GROUP BY) ===\n";
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(charged.total_charged, 0) - COALESCE(paid.total_paid, 0) AS unpaid_interest
        FROM 
            (SELECT ? as member_id) m
        LEFT JOIN 
            (SELECT member_id, SUM(amount) as total_charged 
             FROM interest_charged 
             WHERE member_id = ? 
             GROUP BY member_id) charged ON m.member_id = charged.member_id
        LEFT JOIN 
            (SELECT member_id, SUM(amount) as total_paid 
             FROM interest_paid 
             WHERE member_id = ? 
             GROUP BY member_id) paid ON m.member_id = paid.member_id
    ");
    $stmt->execute([$testMemberId, $testMemberId, $testMemberId]);
    $newResult = $stmt->fetch();
    echo "New Query Result: " . $newResult['unpaid_interest'] . "\n\n";
    
    // Compare results
    if ($oldResult['unpaid_interest'] == $newResult['unpaid_interest']) {
        echo "✅ Both queries return the same result!\n";
        echo "Unpaid Interest: " . $newResult['unpaid_interest'] . "\n";
    } else {
        echo "❌ Results differ!\n";
        echo "Old: " . $oldResult['unpaid_interest'] . "\n";
        echo "New: " . $newResult['unpaid_interest'] . "\n";
    }
    
    // Show breakdown for debugging
    echo "\n=== Breakdown ===\n";
    
    // Interest charged
    $stmt = $pdo->prepare("SELECT SUM(amount) as total_charged FROM interest_charged WHERE member_id = ?");
    $stmt->execute([$testMemberId]);
    $charged = $stmt->fetch();
    echo "Total Interest Charged: " . ($charged['total_charged'] ?? 0) . "\n";
    
    // Interest paid
    $stmt = $pdo->prepare("SELECT SUM(amount) as total_paid FROM interest_paid WHERE member_id = ?");
    $stmt->execute([$testMemberId]);
    $paid = $stmt->fetch();
    echo "Total Interest Paid: " . ($paid['total_paid'] ?? 0) . "\n";
    
    $unpaid = ($charged['total_charged'] ?? 0) - ($paid['total_paid'] ?? 0);
    echo "Calculated Unpaid: $unpaid\n";
    
    // Test with a different member
    echo "\n=== Testing with Member ID 1 ===\n";
    $testMemberId2 = 1;
    
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(charged.total_charged, 0) - COALESCE(paid.total_paid, 0) AS unpaid_interest
        FROM 
            (SELECT ? as member_id) m
        LEFT JOIN 
            (SELECT member_id, SUM(amount) as total_charged 
             FROM interest_charged 
             WHERE member_id = ? 
             GROUP BY member_id) charged ON m.member_id = charged.member_id
        LEFT JOIN 
            (SELECT member_id, SUM(amount) as total_paid 
             FROM interest_paid 
             WHERE member_id = ? 
             GROUP BY member_id) paid ON m.member_id = paid.member_id
    ");
    $stmt->execute([$testMemberId2, $testMemberId2, $testMemberId2]);
    $result2 = $stmt->fetch();
    echo "Member 1 Unpaid Interest: " . $result2['unpaid_interest'] . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
