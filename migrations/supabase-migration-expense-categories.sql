-- Migration: 식비/접대 → 점심식대/접대비 분리
-- 2만원 미만 → 점심식대, 2만원 이상 → 접대비

UPDATE expenses
SET category = '점심식대', updated_at = now()
WHERE category = '식비/접대' AND amount < 20000;

UPDATE expenses
SET category = '접대비', updated_at = now()
WHERE category = '식비/접대' AND amount >= 20000;
