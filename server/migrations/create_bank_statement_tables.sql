-- Migration: Create bank statement processing tables
-- Date: 2025-01-08

-- Bank statement uploads
CREATE TABLE bank_statements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type ENUM('pdf', 'excel', 'image') NOT NULL,
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('uploaded', 'processing', 'completed', 'failed') DEFAULT 'uploaded',
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Extracted transactions
CREATE TABLE extracted_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bank_statement_id INT,
  account_holder_name VARCHAR(255),
  transaction_date DATE,
  amount DECIMAL(10,2),
  transaction_type ENUM('debit', 'credit'),
  description TEXT,
  account_number VARCHAR(50),
  confidence_score DECIMAL(5,2),
  matched_member_id INT NULL,
  status ENUM('extracted', 'matched', 'unmatched', 'processed') DEFAULT 'extracted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_member_id) REFERENCES members(id) ON DELETE SET NULL
);

-- Processing logs
CREATE TABLE statement_processing_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bank_statement_id INT,
  period_id INT,
  processed_by INT,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_transactions INT,
  matched_transactions INT,
  unmatched_transactions INT,
  status ENUM('processing', 'completed', 'failed'),
  FOREIGN KEY (bank_statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for better performance
CREATE INDEX idx_bank_statements_status ON bank_statements(status);
CREATE INDEX idx_extracted_transactions_status ON extracted_transactions(status);
CREATE INDEX idx_extracted_transactions_matched_member ON extracted_transactions(matched_member_id);
CREATE INDEX idx_statement_processing_logs_period ON statement_processing_logs(period_id);