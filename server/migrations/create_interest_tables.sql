-- Migration: Create interest_charged and interest_paid tables
-- Date: 2025-01-09

-- Interest charged table
CREATE TABLE IF NOT EXISTS interest_charged (
  id INT PRIMARY KEY AUTO_INCREMENT,
  member_id INT NOT NULL,
  period_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  charged_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member_period_charged (member_id, period_id),
  INDEX idx_member_id (member_id),
  INDEX idx_period_id (period_id),
  INDEX idx_charged_date (charged_date)
);

-- Interest paid table
CREATE TABLE IF NOT EXISTS interest_paid (
  id INT PRIMARY KEY AUTO_INCREMENT,
  member_id INT NOT NULL,
  period_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member_period_paid (member_id, period_id),
  INDEX idx_member_id (member_id),
  INDEX idx_period_id (period_id),
  INDEX idx_payment_date (payment_date)
);
