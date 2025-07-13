-- Create transaction_categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category_type (name, type),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default categories
INSERT INTO transaction_categories (name, type, created_by) VALUES
('Dues', 'income', 1),
('Loan Interest', 'income', 1),
('Rent', 'expense', 1),
('Office Expense', 'expense', 1),
('Salary', 'expense', 1),
('Miscellaneous', 'income', 1),
('Miscellaneous', 'expense', 1);

-- Add category_id column to coop_transactions table if it doesn't exist
ALTER TABLE coop_transactions 
ADD COLUMN IF NOT EXISTS category_id INT,
ADD FOREIGN KEY (category_id) REFERENCES transaction_categories(id) ON DELETE SET NULL; 