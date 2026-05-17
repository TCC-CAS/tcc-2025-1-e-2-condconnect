-- ================================================================
-- CondConnect – Adiciona coluna de código de entrega
-- Execute no banco engenharia_16 (HeidiSQL: File → Run SQL file)
-- ================================================================

ALTER TABLE pedidos
    ADD COLUMN codigo_entrega CHAR(4) NULL AFTER status;
