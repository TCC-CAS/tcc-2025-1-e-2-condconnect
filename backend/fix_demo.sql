-- ================================================================
-- CondConnect – Correções pós-importação de dados demo
-- Execute este script no banco engenharia_16
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- 1. CORRIGIR FOTOS QUEBRADAS (URLs removidas do Unsplash)
-- ----------------------------------------------------------------
UPDATE produtos
SET foto_principal = 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80'
WHERE titulo = 'Pulseira de Macramê Boho' AND usuario_id = 9;

UPDATE produtos
SET foto_principal = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80'
WHERE titulo = 'Porta-Velas de Macramê' AND usuario_id = 9;

UPDATE produtos
SET foto_principal = 'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?w=600&q=80'
WHERE titulo = 'Perfume Artesanal — Flor de Cerejeira' AND usuario_id = 17;

UPDATE produtos
SET foto_principal = 'https://images.unsplash.com/photo-1512238972977-f60c7c5f1e6c?w=600&q=80'
WHERE titulo = 'Vela Aromática Lavanda & Baunilha' AND usuario_id = 17;

-- ----------------------------------------------------------------
-- 2. REMOVER "Pack 4 Aulas de Violão" e suas dependências
-- ----------------------------------------------------------------
DELETE a FROM avaliacoes a
JOIN produtos p ON a.produto_id = p.id
WHERE p.titulo = 'Pack 4 Aulas de Violão' AND p.usuario_id = 14;

DELETE pe FROM pedidos pe
JOIN produtos p ON pe.produto_id = p.id
WHERE p.titulo = 'Pack 4 Aulas de Violão' AND p.usuario_id = 14;

DELETE f FROM favoritos f
JOIN produtos p ON f.produto_id = p.id
WHERE p.titulo = 'Pack 4 Aulas de Violão' AND p.usuario_id = 14;

DELETE FROM produtos
WHERE titulo = 'Pack 4 Aulas de Violão' AND usuario_id = 14;

-- ----------------------------------------------------------------
-- 3. REMOVER "Vela Aromática Lavanda & Baunilha" e suas dependências
-- ----------------------------------------------------------------
DELETE FROM produto_insumos
WHERE produto_id = (SELECT id FROM produtos WHERE titulo = 'Vela Aromática Lavanda & Baunilha' AND usuario_id = 17 LIMIT 1);

DELETE a FROM avaliacoes a
JOIN produtos p ON a.produto_id = p.id
WHERE p.titulo = 'Vela Aromática Lavanda & Baunilha' AND p.usuario_id = 17;

DELETE pe FROM pedidos pe
JOIN produtos p ON pe.produto_id = p.id
WHERE p.titulo = 'Vela Aromática Lavanda & Baunilha' AND p.usuario_id = 17;

DELETE f FROM favoritos f
JOIN produtos p ON f.produto_id = p.id
WHERE p.titulo = 'Vela Aromática Lavanda & Baunilha' AND p.usuario_id = 17;

DELETE FROM produtos
WHERE titulo = 'Vela Aromática Lavanda & Baunilha' AND usuario_id = 17;

-- ----------------------------------------------------------------
-- 4. REMOVER todos os dados do usuário João Bueno (ID 10)
-- ----------------------------------------------------------------
DELETE FROM avaliacoes WHERE avaliador_id = 10 OR avaliado_id = 10;
DELETE FROM pedidos    WHERE comprador_id = 10  OR vendedor_id = 10;
DELETE FROM favoritos  WHERE usuario_id = 10;

-- ----------------------------------------------------------------
-- 5. MÉTRICAS ATUALIZADAS
-- Zeca (14): 1 venda (violão), 1 compra (ped18), 1 avaliação nota 4 → rating 4.00
-- Fausto (15): 4 vendas, 0 compras entregues
-- Gabriel (16): 3 compras entregues (ped25 removido)
-- Gabriela (17): 3 vendas, rating 4.67 (avaliação de ped25 removida)
-- ----------------------------------------------------------------
UPDATE usuarios SET rating = 4.00, total_vendas = 1, total_compras = 1 WHERE id = 14;
UPDATE usuarios SET total_compras = 0 WHERE id = 15;
UPDATE usuarios SET total_compras = 3 WHERE id = 16;
UPDATE usuarios SET rating = 4.67, total_vendas = 3 WHERE id = 17;

SET FOREIGN_KEY_CHECKS = 1;
