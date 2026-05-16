-- ================================================================
-- CondConnect – Geração em massa de vendas (sem tabelas temporárias)
-- Requer apenas INSERT/UPDATE/SELECT — sem CREATE TABLE
-- Execute APÓS dados_demo.sql, fix_demo.sql e mais_vendas.sql
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. PEDIDOS ───────────────────────────────────────────────────
-- Um único INSERT gera 40 pedidos por produto (26 produtos × 40 = 1.040 linhas)
-- CROSS JOIN com subquery inline substitui a tabela temporária
-- CASE por vendedor garante que o comprador nunca é o próprio vendedor

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em)
SELECT
    CASE p.usuario_id
        WHEN 4  THEN CAST(ELT(1+FLOOR(RAND()*12),'5','6','7','8','9','11','12','13','14','15','16','17') AS UNSIGNED)
        WHEN 9  THEN CAST(ELT(1+FLOOR(RAND()*12),'4','5','6','7','8','11','12','13','14','15','16','17') AS UNSIGNED)
        WHEN 12 THEN CAST(ELT(1+FLOOR(RAND()*12),'4','5','6','7','8','9','11','13','14','15','16','17') AS UNSIGNED)
        WHEN 14 THEN CAST(ELT(1+FLOOR(RAND()*12),'4','5','6','7','8','9','11','12','13','15','16','17') AS UNSIGNED)
        WHEN 15 THEN CAST(ELT(1+FLOOR(RAND()*12),'4','5','6','7','8','9','11','12','13','14','16','17') AS UNSIGNED)
        WHEN 16 THEN CAST(ELT(1+FLOOR(RAND()*12),'4','5','6','7','8','9','11','12','13','14','15','17') AS UNSIGNED)
        WHEN 17 THEN CAST(ELT(1+FLOOR(RAND()*12),'4','5','6','7','8','9','11','12','13','14','15','16') AS UNSIGNED)
    END,
    p.usuario_id,
    p.id,
    1,
    p.preco,
    'entregue',
    NOW() - INTERVAL (1 + FLOOR(RAND() * 365)) DAY
FROM produtos p
CROSS JOIN (
    SELECT 1 n UNION ALL SELECT 2  UNION ALL SELECT 3  UNION ALL SELECT 4  UNION ALL SELECT 5
    UNION ALL SELECT 6  UNION ALL SELECT 7  UNION ALL SELECT 8  UNION ALL SELECT 9  UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
    UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
    UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
    UNION ALL SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35
    UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39 UNION ALL SELECT 40
) seq
WHERE p.usuario_id IN (4, 9, 12, 14, 15, 16, 17)
  AND p.status = 'disponivel';

-- ── 2. AVALIAÇÕES ────────────────────────────────────────────────
-- Insere uma avaliação para cada pedido que ainda não tem uma

INSERT IGNORE INTO avaliacoes
    (avaliador_id, avaliado_id, produto_id, pedido_id, nota, comentario, criado_em)
SELECT
    p.comprador_id,
    p.vendedor_id,
    p.produto_id,
    p.id,
    IF(RAND() < 0.80, 5, 4),
    ELT(1 + FLOOR(RAND() * 15),
        'Produto incrível! Superou minhas expectativas. Vendedor atencioso e entrega rápida. Recomendo!',
        'Chegou no prazo e em perfeito estado. Exatamente como descrito. Ótima experiência de compra!',
        'Compra fácil e segura. Produto de ótima qualidade. Com certeza voltarei a comprar!',
        'Vendedor confiável e muito comunicativo. Produto em excelente estado. Super satisfeito!',
        'Produto maravilhoso! Vale muito o preço. Embalagem cuidadosa e entrega dentro do prazo.',
        'Ótimo negócio! Produto tal qual o anúncio. Recomendo sem hesitar.',
        'Excelente atendimento! Produto de qualidade e bem conservado. Nota 10!',
        'Produto perfeito, exatamente o que eu precisava. Transação tranquila e segura.',
        'Muito satisfeito com a compra! Produto melhor ainda do que nas fotos. Voltarei a comprar.',
        'Boa qualidade e preço justo. Vendedor prestativo e honesto. Recomendo!',
        'Chegou antes do prazo! Produto em excelente estado. Estou adorando o uso diário.',
        'Produto fantástico e vendedor super atencioso. Experiência de compra impecável!',
        'Tudo certo! Produto bem embalado, rápido e eficiente. Recomendo para todos do condomínio.',
        'Comprei como presente e a pessoa amou! Qualidade excelente e atendimento nota 10.',
        'Ótimo custo-benefício. Produto duradouro e com acabamento de qualidade. Recomendo!'),
    p.criado_em + INTERVAL 1 DAY
FROM pedidos p
WHERE p.status = 'entregue'
  AND p.vendedor_id IN (4, 9, 12, 14, 15, 16, 17)
  AND NOT EXISTS (SELECT 1 FROM avaliacoes a WHERE a.pedido_id = p.id);

-- ── 3. MÉTRICAS ──────────────────────────────────────────────────
-- Recalcula diretamente do banco — sempre correto

UPDATE usuarios SET
    total_vendas  = (SELECT COUNT(*) FROM pedidos p
                     WHERE p.vendedor_id  = usuarios.id AND p.status = 'entregue'),
    total_compras = (SELECT COUNT(*) FROM pedidos p
                     WHERE p.comprador_id = usuarios.id AND p.status = 'entregue'),
    rating        = COALESCE(
                        (SELECT ROUND(AVG(a.nota), 2) FROM avaliacoes a
                         WHERE a.avaliado_id = usuarios.id),
                        rating)
WHERE id IN (4, 9, 12, 14, 15, 16, 17);

SET FOREIGN_KEY_CHECKS = 1;
