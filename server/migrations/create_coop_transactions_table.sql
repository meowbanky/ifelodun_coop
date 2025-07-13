-- Create coop_transactions table
CREATE TABLE IF NOT EXISTS coop_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  category_id INT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES transaction_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_date (date),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at)
);

-- Insert some sample data if table is empty
INSERT IGNORE INTO coop_transactions (date, type, amount, description, category, created_at) VALUES
('2024-01-15', 'income', 50000.00, 'Monthly membership fees', 'Membership Fees', NOW()),
('2024-01-20', 'expense', 15000.00, 'Office supplies and stationery', 'Office Expenses', NOW()),
('2024-01-25', 'income', 25000.00, 'Interest income from loans', 'Interest Income', NOW()),
('2024-01-30', 'expense', 8000.00, 'Utility bills payment', 'Utilities', NOW()); 