<?php
require_once '../config/database.php';
require_once '../utils/auth.php';

// Load environment variables
if (file_exists('../.env')) {
    $lines = file('../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
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
        if (count($path_parts) >= 2) {
            $memberId = $path_parts[0];
            $action = $path_parts[1];
            
            switch ($action) {
                case 'summary':
                    handleMemberSummary($memberId);
                    break;
                case 'history':
                    handleMemberHistory($memberId);
                    break;
                case 'profile':
                    handleMemberProfile($memberId);
                    break;
                case 'settings':
                    handleGetMemberSettings($memberId);
                    break;
                default:
                    ApiResponse::error('Endpoint not found', 404);
            }
        } elseif (count($path_parts) >= 3 && $path_parts[0] === 'member') {
            // Handle /member/:id/profile endpoint
            $memberId = $path_parts[1];
            $action = $path_parts[2];
            if ($action === 'profile') {
                handleDetailedMemberProfile($memberId);
            } else {
                ApiResponse::error('Endpoint not found', 404);
            }
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    case 'PUT':
        if (count($path_parts) >= 2) {
            $memberId = $path_parts[0];
            $action = $path_parts[1];
            
            if ($action === 'settings') {
                handleUpdateMemberSettings($memberId);
            } else {
                ApiResponse::error('Endpoint not found', 404);
            }
        } else {
            ApiResponse::error('Endpoint not found', 404);
        }
        break;
    default:
        ApiResponse::error('Method not allowed', 405);
}

function handleMemberSummary($memberId) {
    try {
        $pdo = getDbConnection();
        
        // 1. Total Shares + Savings
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(shares), 0) + COALESCE(SUM(savings), 0) AS total_share_savings
            FROM member_balances WHERE member_id = ?
        ");
        $stmt->execute([$memberId]);
        $shareSavings = $stmt->fetch();

        // 2. Loan Repayment
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(amount), 0) AS loan_repayment
            FROM loan_repayments WHERE member_id = ?
        ");
        $stmt->execute([$memberId]);
        $loanRepay = $stmt->fetch();

        // 3. Unpaid Interest
        $stmt = $pdo->prepare("
            SELECT 
                (COALESCE((SELECT SUM(amount) FROM interest_charged WHERE member_id = ?), 0) -
                 COALESCE((SELECT SUM(amount) FROM interest_paid WHERE member_id = ?), 0)
                ) AS unpaid_interest
        ");
        $stmt->execute([$memberId, $memberId]);
        $interest = $stmt->fetch();

        // 4. Total Loan
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(amount), 0) AS total_loan
            FROM loans WHERE member_id = ? AND status IN ('approved', 'active', 'completed')
        ");
        $stmt->execute([$memberId]);
        $totalLoan = $stmt->fetch();

        ApiResponse::success([
            'total_share_savings' => floatval($shareSavings['total_share_savings']),
            'loan_balance' => floatval($totalLoan['total_loan']) - floatval($loanRepay['loan_repayment']),
            'unpaid_interest' => floatval($interest['unpaid_interest']),
            'total_loan' => floatval($totalLoan['total_loan'])
        ]);

    } catch (Exception $e) {
        error_log("Member summary error: " . $e->getMessage());
        ApiResponse::error('Error fetching member summary', 500);
    }
}

function handleMemberHistory($memberId) {
    // Authenticate token
    AuthUtils::authenticateToken();
    
    $fromId = intval($_GET['from'] ?? 0);
    $toId = intval($_GET['to'] ?? 0);

    if (!$fromId || !$toId || !$memberId) {
        ApiResponse::error('Missing period range or memberId');
    }

    try {
        $pdo = getDbConnection();
        
        $stmt = $pdo->prepare("
            WITH AggregatedData AS (
                SELECT
                    m.id AS member_id_num,
                    m.member_id,
                    m.first_name,
                    m.last_name,
                    p.id AS period_id,
                    p.name AS period_name,
                    COALESCE(SUM(mb.shares), 0) AS shares_amount,
                    COALESCE(SUM(mb.savings), 0) AS savings_amount,
                    COALESCE(SUM(l.amount), 0) AS loan_amount,
                    COALESCE(SUM(lr.amount), 0) AS loan_repayment,
                    COALESCE(SUM(ic.amount), 0) AS interest_charged,
                    COALESCE(SUM(ip.amount), 0) AS interest_paid,
                    COALESCE(SUM(c.amount), 0) AS commodity_amount,
                    COALESCE(SUM(cr.amount), 0) AS commodity_repayment,
                    COALESCE(SUM(dlf.amount), 0) AS dev_levy,
                    COALESCE(SUM(sf.amount), 0) AS stationery,
                    COALESCE(SUM(ef.amount), 0) AS entry_fees
                FROM members m
                CROSS JOIN periods p
                LEFT JOIN member_balances mb ON m.id = mb.member_id AND p.id = mb.period_id
                LEFT JOIN loans l ON m.id = l.member_id AND p.id = l.period_id
                LEFT JOIN loan_repayments lr ON m.id = lr.member_id AND p.id = lr.period_id
                LEFT JOIN interest_charged ic ON m.id = ic.member_id AND p.id = ic.period_id
                LEFT JOIN interest_paid ip ON m.id = ip.member_id AND p.id = ip.period_id
                LEFT JOIN commodities c ON m.id = c.member_id AND p.id = c.period_id
                LEFT JOIN commodity_repayments cr ON m.id = cr.member_id AND p.id = cr.period_id
                LEFT JOIN development_levy_fees dlf ON m.id = dlf.member_id AND p.id = dlf.period_id
                LEFT JOIN stationery_fees sf ON m.id = sf.member_id AND p.id = sf.period_id
                LEFT JOIN entry_fees ef ON m.id = ef.member_id AND p.id = ef.period_id
                WHERE p.id BETWEEN ? AND ? AND m.id = ?
                GROUP BY m.id, m.member_id, m.first_name, m.last_name, p.id, p.name
            )
            SELECT 
                member_id_num,
                member_id,
                first_name,
                last_name,
                period_id,
                period_name,
                shares_amount,
                COALESCE(SUM(shares_amount) OVER (PARTITION BY member_id_num ORDER BY period_id), 0) AS shares_balance,
                savings_amount,
                COALESCE(SUM(savings_amount) OVER (PARTITION BY member_id_num ORDER BY period_id), 0) AS savings_balance,
                loan_amount,
                loan_repayment,
                COALESCE(
                    SUM(loan_amount) OVER (PARTITION BY member_id_num ORDER BY period_id)
                    - SUM(loan_repayment) OVER (PARTITION BY member_id_num ORDER BY period_id),
                    0
                ) AS loan_balance,
                interest_charged,
                interest_paid,
                COALESCE(
                    SUM(interest_charged - interest_paid) OVER (PARTITION BY member_id_num ORDER BY period_id),
                    0
                ) AS unpaid_interest,
                commodity_amount,
                commodity_repayment,
                COALESCE(
                    SUM(commodity_amount - commodity_repayment) OVER (PARTITION BY member_id_num ORDER BY period_id),
                    0
                ) AS commodity_balance,
                dev_levy,
                stationery,
                entry_fees
            FROM AggregatedData
            ORDER BY period_id
        ");
        
        $stmt->execute([$fromId, $toId, $memberId]);
        $rows = $stmt->fetchAll();

        ApiResponse::success(['data' => $rows]);

    } catch (Exception $e) {
        error_log("History report error: " . $e->getMessage());
        ApiResponse::error('Error fetching history report', 500);
    }
}

function handleMemberProfile($memberId) {
    try {
        $pdo = getDbConnection();

        $stmt = $pdo->prepare("
            SELECT first_name, last_name, email, phone_number, address, membership_date
            FROM members WHERE id = ?
        ");
        $stmt->execute([$memberId]);
        $profile = $stmt->fetch();

        if (!$profile) {
            ApiResponse::error('Member not found', 404);
        }

        ApiResponse::success($profile);

    } catch (Exception $e) {
        error_log("Profile error: " . $e->getMessage());
        ApiResponse::error('Error fetching profile', 500);
    }
}

function handleGetMemberSettings($memberId) {
    // Authenticate token
    AuthUtils::authenticateToken();

    try {
        $pdo = getDbConnection();

        $stmt = $pdo->prepare("
            SELECT id, allow_savings_with_loan, savings_with_loan_amount
            FROM members WHERE id = ?
        ");
        $stmt->execute([$memberId]);
        $member = $stmt->fetch();

        if (!$member) {
            ApiResponse::error('Member not found', 404);
        }

        ApiResponse::success([
            'data' => [
                'allow_savings_with_loan' => (bool)$member['allow_savings_with_loan'],
                'savings_with_loan_amount' => floatval($member['savings_with_loan_amount'] ?? 0.0)
            ],
            'message' => "Settings for member ID $memberId retrieved successfully"
        ]);

    } catch (Exception $e) {
        error_log("Get member settings error: " . $e->getMessage());
        ApiResponse::error('Failed to retrieve settings', 500);
    }
}

function handleUpdateMemberSettings($memberId) {
    // Authenticate token
    AuthUtils::authenticateToken();

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        ApiResponse::error('Invalid JSON input');
    }

    $allowSavingsWithLoan = $input['allow_savings_with_loan'] ?? null;
    $savingsWithLoanAmount = $input['savings_with_loan_amount'] ?? null;

    // Validation
    if (!is_bool($allowSavingsWithLoan)) {
        ApiResponse::error('allow_savings_with_loan must be a boolean.');
    }

    if (!is_numeric($savingsWithLoanAmount) || is_nan($savingsWithLoanAmount)) {
        ApiResponse::error('savings_with_loan_amount must be a number.');
    }

    if ($savingsWithLoanAmount < 0) {
        ApiResponse::error('savings_with_loan_amount must be positive.');
    }

    if ($allowSavingsWithLoan && $savingsWithLoanAmount == 0) {
        ApiResponse::error('Please enter a savings amount when allowing savings with loan.');
    }

    try {
        $pdo = getDbConnection();

        // Check member exists
        $stmt = $pdo->prepare("SELECT id FROM members WHERE id = ?");
        $stmt->execute([$memberId]);
        if (!$stmt->fetch()) {
            ApiResponse::error('Member not found', 404);
        }

        // Update settings
        $stmt = $pdo->prepare("
            UPDATE members
            SET allow_savings_with_loan = ?, savings_with_loan_amount = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$allowSavingsWithLoan, $savingsWithLoanAmount, $memberId]);

        ApiResponse::success([
            'message' => "Settings for member ID $memberId updated successfully"
        ]);

    } catch (Exception $e) {
        error_log("Update member settings error: " . $e->getMessage());
        ApiResponse::error('Failed to update settings', 500);
    }
}

function handleDetailedMemberProfile($memberId) {
    // Authenticate token
    AuthUtils::authenticateToken();

    try {
        $pdo = getDbConnection();

        $stmt = $pdo->prepare("
            SELECT
                m.id AS member_id,
                m.member_id AS member_code,
                m.first_name,
                m.last_name,
                m.middle_name,
                m.phone_number,
                m.email,
                m.address,
                m.date_of_birth,
                m.gender,
                m.membership_date,
                m.employment_status,
                m.membership_status,
                m.allow_savings_with_loan,
                m.savings_with_loan_amount,
                nok.id AS nok_id,
                nok.first_name AS nok_first_name,
                nok.last_name AS nok_last_name,
                nok.relationship,
                nok.phone_number AS nok_phone,
                nok.address AS nok_address
            FROM members m
            LEFT JOIN next_of_kin nok ON m.id = nok.member_id
            WHERE m.id = ?
        ");
        $stmt->execute([$memberId]);
        $rows = $stmt->fetchAll();

        if (empty($rows)) {
            ApiResponse::error('Member not found', 404);
        }

        // Build member object with next of kin
        $member = [
            'member_id' => $rows[0]['member_id'],
            'member_code' => $rows[0]['member_code'],
            'first_name' => $rows[0]['first_name'],
            'last_name' => $rows[0]['last_name'],
            'middle_name' => $rows[0]['middle_name'],
            'phone_number' => $rows[0]['phone_number'],
            'email' => $rows[0]['email'],
            'address' => $rows[0]['address'],
            'date_of_birth' => $rows[0]['date_of_birth'],
            'gender' => $rows[0]['gender'],
            'membership_date' => $rows[0]['membership_date'],
            'employment_status' => $rows[0]['employment_status'],
            'membership_status' => $rows[0]['membership_status'],
            'allow_savings_with_loan' => $rows[0]['allow_savings_with_loan'],
            'savings_with_loan_amount' => $rows[0]['savings_with_loan_amount'],
            'next_of_kin' => []
        ];

        // Add next of kin if exists
        foreach ($rows as $row) {
            if ($row['nok_id'] !== null) {
                $member['next_of_kin'][] = [
                    'id' => $row['nok_id'],
                    'first_name' => $row['nok_first_name'],
                    'last_name' => $row['nok_last_name'],
                    'relationship' => $row['relationship'],
                    'phone_number' => $row['nok_phone'],
                    'address' => $row['nok_address']
                ];
            }
        }

        ApiResponse::success(['data' => $member]);

    } catch (Exception $e) {
        error_log("Detailed profile error: " . $e->getMessage());
        ApiResponse::error('Error fetching profile', 500);
    }
}
?>
