-- Add period_id to coop_transactions
ALTER TABLE coop_transactions ADD COLUMN period_id INT NULL AFTER id;

-- Optionally, backfill period_id for existing records if you can infer the period from the date
-- (This step is left as a comment because it depends on your period naming/date logic)
-- UPDATE coop_transactions ct
-- JOIN periods p ON (YEAR(ct.date) = RIGHT(p.name, 4) AND MONTHNAME(ct.date) = LEFT(p.name, LENGTH(p.name) - 5))
-- SET ct.period_id = p.id;

ALTER TABLE coop_transactions ADD CONSTRAINT fk_coop_transactions_period FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL;

CREATE INDEX idx_coop_transactions_period_id ON coop_transactions(period_id); 