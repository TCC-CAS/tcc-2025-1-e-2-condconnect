-- ================================================================
-- CondConnect – Mais vendas e avaliações para dados demo
-- Execute APÓS dados_demo.sql e fix_demo.sql
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- Carrega IDs dos produtos pelo título (robusto, sem LAST_INSERT_ID)
-- ----------------------------------------------------------------
SET @p1  = (SELECT id FROM produtos WHERE titulo = 'Brigadeiro Gourmet'                   AND usuario_id = 4  LIMIT 1);
SET @p2  = (SELECT id FROM produtos WHERE titulo = 'Bolo de Leite Ninho com Morango'       AND usuario_id = 4  LIMIT 1);
SET @p3  = (SELECT id FROM produtos WHERE titulo = 'Coxinha de Frango com Catupiry'        AND usuario_id = 4  LIMIT 1);
SET @p4  = (SELECT id FROM produtos WHERE titulo = 'Kit 20 Brigadeiros Sortidos'           AND usuario_id = 4  LIMIT 1);
SET @p5  = (SELECT id FROM produtos WHERE titulo = 'Pulseira de Macramê Boho'              AND usuario_id = 9  LIMIT 1);
SET @p6  = (SELECT id FROM produtos WHERE titulo = 'Vaso de Crochê Decorativo'             AND usuario_id = 9  LIMIT 1);
SET @p7  = (SELECT id FROM produtos WHERE titulo = 'Quadro Decorativo em Tela — Abstrato'  AND usuario_id = 9  LIMIT 1);
SET @p8  = (SELECT id FROM produtos WHERE titulo = 'Porta-Velas de Macramê'                AND usuario_id = 9  LIMIT 1);
SET @p9  = (SELECT id FROM produtos WHERE titulo = 'Jogo de Tabuleiro — Catan'             AND usuario_id = 12 LIMIT 1);
SET @p10 = (SELECT id FROM produtos WHERE titulo = 'Coleção Harry Potter — 7 Volumes'      AND usuario_id = 12 LIMIT 1);
SET @p11 = (SELECT id FROM produtos WHERE titulo = 'Smartwatch Xiaomi Mi Band 7'           AND usuario_id = 12 LIMIT 1);
SET @p12 = (SELECT id FROM produtos WHERE titulo = 'Monitor LG 22" Full HD IPS'            AND usuario_id = 12 LIMIT 1);
SET @p14 = (SELECT id FROM produtos WHERE titulo = 'Violão Nylon Yamaha C40'               AND usuario_id = 14 LIMIT 1);
SET @p15 = (SELECT id FROM produtos WHERE titulo = 'Gaita Cromática Hohner 10 Furos'       AND usuario_id = 14 LIMIT 1);
SET @p16 = (SELECT id FROM produtos WHERE titulo = 'Coletânea MPB Clássica — 50 Partituras' AND usuario_id = 14 LIMIT 1);
SET @p17 = (SELECT id FROM produtos WHERE titulo = 'Controle PS4 DualShock 4 — Preto'     AND usuario_id = 15 LIMIT 1);
SET @p18 = (SELECT id FROM produtos WHERE titulo = 'Fone Bluetooth JBL Tune 510BT'         AND usuario_id = 15 LIMIT 1);
SET @p19 = (SELECT id FROM produtos WHERE titulo = 'Mouse Gamer Logitech G203'             AND usuario_id = 15 LIMIT 1);
SET @p20 = (SELECT id FROM produtos WHERE titulo = 'Teclado Mecânico Redragon K552'        AND usuario_id = 15 LIMIT 1);
SET @p21 = (SELECT id FROM produtos WHERE titulo = 'Par de Halteres 5kg — Emborrachados'  AND usuario_id = 16 LIMIT 1);
SET @p22 = (SELECT id FROM produtos WHERE titulo = 'Tapete de Yoga Premium 6mm'            AND usuario_id = 16 LIMIT 1);
SET @p23 = (SELECT id FROM produtos WHERE titulo = 'Corda de Pular Speed Profissional'     AND usuario_id = 16 LIMIT 1);
SET @p24 = (SELECT id FROM produtos WHERE titulo = 'Mochila Esportiva Nike 30L'            AND usuario_id = 16 LIMIT 1);
SET @p25 = (SELECT id FROM produtos WHERE titulo = 'Kit Skincare Completo — Pele Seca'     AND usuario_id = 17 LIMIT 1);
SET @p26 = (SELECT id FROM produtos WHERE titulo = 'Perfume Artesanal — Flor de Cerejeira' AND usuario_id = 17 LIMIT 1);
SET @p28 = (SELECT id FROM produtos WHERE titulo = 'Kit 6 Esmaltes Artesanais'             AND usuario_id = 17 LIMIT 1);

-- ----------------------------------------------------------------
-- NOVOS PEDIDOS ENTREGUES
-- ----------------------------------------------------------------

-- Ana (ID 4) — vendedora
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(15, 4, @p2, 1, 95.00, 'entregue', NOW() - INTERVAL 30 DAY);
SET @nped1 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(14, 4, @p2, 1, 95.00, 'entregue', NOW() - INTERVAL 18 DAY);
SET @nped2 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 4, @p4, 1, 98.00, 'entregue', NOW() - INTERVAL 22 DAY);
SET @nped3 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(7, 4, @p3, 1, 42.00, 'entregue', NOW() - INTERVAL 15 DAY);
SET @nped4 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(6, 4, @p1, 10, 50.00, 'entregue', NOW() - INTERVAL 10 DAY);
SET @nped5 = LAST_INSERT_ID();

-- Beatriz (ID 9) — vendedora
-- @p8 Porta-Velas: sem vendas anteriores
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 9, @p8, 1, 45.00, 'entregue', NOW() - INTERVAL 55 DAY);
SET @nped6 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(14, 9, @p8, 2, 90.00, 'entregue', NOW() - INTERVAL 28 DAY);
SET @nped7 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(17, 9, @p5, 1, 38.00, 'entregue', NOW() - INTERVAL 45 DAY);
SET @nped8 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(15, 9, @p6, 1, 65.00, 'entregue', NOW() - INTERVAL 32 DAY);
SET @nped9 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(8, 9, @p7, 1, 120.00, 'entregue', NOW() - INTERVAL 38 DAY);
SET @nped10 = LAST_INSERT_ID();

-- Bruno (ID 12) — vendedor
-- @p12 Monitor LG: sem vendas anteriores
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 12, @p12, 1, 420.00, 'entregue', NOW() - INTERVAL 62 DAY);
SET @nped11 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(17, 12, @p12, 1, 420.00, 'entregue', NOW() - INTERVAL 28 DAY);
SET @nped12 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(14, 12, @p9, 1, 140.00, 'entregue', NOW() - INTERVAL 42 DAY);
SET @nped13 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(15, 12, @p10, 1, 280.00, 'entregue', NOW() - INTERVAL 20 DAY);
SET @nped14 = LAST_INSERT_ID();

-- Zeca (ID 14) — vendedor
-- @p15 Gaita e @p16 Coletânea: sem vendas anteriores
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 14, @p15, 1, 85.00, 'entregue', NOW() - INTERVAL 58 DAY);
SET @nped15 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 14, @p15, 1, 85.00, 'entregue', NOW() - INTERVAL 25 DAY);
SET @nped16 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 14, @p16, 1, 38.00, 'entregue', NOW() - INTERVAL 48 DAY);
SET @nped17 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 14, @p16, 2, 76.00, 'entregue', NOW() - INTERVAL 18 DAY);
SET @nped18 = LAST_INSERT_ID();

-- Fausto (ID 15) — vendedor
-- @p20 Teclado: sem vendas anteriores
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 15, @p20, 1, 270.00, 'entregue', NOW() - INTERVAL 65 DAY);
SET @nped19 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(17, 15, @p20, 1, 270.00, 'entregue', NOW() - INTERVAL 22 DAY);
SET @nped20 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 15, @p17, 1, 185.00, 'entregue', NOW() - INTERVAL 38 DAY);
SET @nped21 = LAST_INSERT_ID();

-- Gabriel (ID 16) — vendedor
-- @p23 Corda e @p24 Mochila: sem vendas anteriores
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 16, @p23, 1, 58.00, 'entregue', NOW() - INTERVAL 60 DAY);
SET @nped22 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(15, 16, @p23, 1, 58.00, 'entregue', NOW() - INTERVAL 18 DAY);
SET @nped23 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(14, 16, @p24, 1, 130.00, 'entregue', NOW() - INTERVAL 42 DAY);
SET @nped24 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 16, @p24, 1, 130.00, 'entregue', NOW() - INTERVAL 15 DAY);
SET @nped25 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(11, 16, @p21, 1, 180.00, 'entregue', NOW() - INTERVAL 30 DAY);
SET @nped26 = LAST_INSERT_ID();

-- Gabriela (ID 17) — vendedora
-- @p28 Kit Esmaltes: sem vendas anteriores
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 17, @p28, 2, 58.00, 'entregue', NOW() - INTERVAL 68 DAY);
SET @nped27 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 17, @p28, 3, 87.00, 'entregue', NOW() - INTERVAL 45 DAY);
SET @nped28 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 17, @p28, 1, 29.00, 'entregue', NOW() - INTERVAL 22 DAY);
SET @nped29 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 17, @p26, 1, 88.00, 'entregue', NOW() - INTERVAL 50 DAY);
SET @nped30 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- AVALIAÇÕES DOS NOVOS PEDIDOS
-- avaliador = comprador, avaliado = vendedor
-- ----------------------------------------------------------------
INSERT INTO avaliacoes (avaliador_id, avaliado_id, produto_id, pedido_id, nota, comentario, criado_em) VALUES
-- Ana (vendedora) — novos compradores
(15, 4, @p2, @nped1, 5, 'Bolo perfeito para o aniversário do meu filho! Recheio cremoso e decoração linda. Já encomendei para o próximo mês!', NOW() - INTERVAL 28 DAY),
(14, 4, @p2, @nped2, 5, 'Bolo incrível! Todo mundo da família perguntou onde comprei. Com certeza farei mais pedidos!', NOW() - INTERVAL 16 DAY),
(12, 4, @p4, @nped3, 5, 'Kit presenteado para os professores e fez o maior sucesso! Embalagem linda e brigadeiros deliciosos.', NOW() - INTERVAL 20 DAY),
(7,  4, @p3, @nped4, 4, 'Coxinhas bem recheadas e massa sequinha. Pedi para um lanchinho e todo mundo amou. Voltarei a pedir!', NOW() - INTERVAL 13 DAY),
(6,  4, @p1, @nped5, 5, 'Brigadeiros para a festa de escola e acabaram em minutos! Qualidade excepcional.', NOW() - INTERVAL 8 DAY),
-- Beatriz (vendedora) — Porta-Velas estreia + extras
(4,  9, @p8, @nped6,  5, 'Porta-velas lindo! Ficou perfeito na mesa de jantar. Beatriz é super atenciosa com as peças.', NOW() - INTERVAL 53 DAY),
(14, 9, @p8, @nped7,  5, 'Comprei 2 para presentear e as duas foram elogiadas! Qualidade artesanal impecável.', NOW() - INTERVAL 26 DAY),
(17, 9, @p5, @nped8,  5, 'Pulseira delicada e bem feita! Uso todos os dias. Recebi muitos elogios.', NOW() - INTERVAL 43 DAY),
(15, 9, @p6, @nped9,  4, 'Vaso lindo para a minha planta. Chegou bem embalado e é ainda mais bonito pessoalmente!', NOW() - INTERVAL 30 DAY),
(8,  9, @p7, @nped10, 5, 'Quadro incrível, valorizou demais a sala! Cores vivas e acabamento de artista.', NOW() - INTERVAL 36 DAY),
-- Bruno (vendedor) — Monitor estreia + extras
(4,  12, @p12, @nped11, 5, 'Monitor em perfeito estado como anunciado! Bruno super honesto e produto de qualidade.', NOW() - INTERVAL 60 DAY),
(17, 12, @p12, @nped12, 5, 'Monitor conforme descrito. Imagem nítida e cores excelentes. Ótimo custo-benefício!', NOW() - INTERVAL 26 DAY),
(14, 12, @p9,  @nped13, 5, 'Jogo em ótimo estado! Bruno muito comunicativo. Já jogamos na família várias vezes.', NOW() - INTERVAL 40 DAY),
(15, 12, @p10, @nped14, 5, 'Coleção maravilhosa! Livros bem conservados. Presente perfeito para quem ama leitura.', NOW() - INTERVAL 18 DAY),
-- Zeca (vendedor) — Gaita e Coletânea estreiam
(4,  14, @p15, @nped15, 5, 'Gaita em excelente estado! Zeca muito cuidadoso com os produtos. Já estou aprendendo a tocar!', NOW() - INTERVAL 56 DAY),
(9,  14, @p15, @nped16, 4, 'Gaita Hohner de qualidade. Toco samba com ela toda semana. Super recomendo!', NOW() - INTERVAL 23 DAY),
(9,  14, @p16, @nped17, 5, 'Livro lindo! 50 partituras das melhores músicas brasileiras. Comprarei mais!', NOW() - INTERVAL 46 DAY),
(12, 14, @p16, @nped18, 5, 'Comprei 2 para presentear amigos músicos. Fizeram o maior sucesso!', NOW() - INTERVAL 16 DAY),
-- Fausto (vendedor) — Teclado estreia + extra
(9,  15, @p20, @nped19, 5, 'Teclado em ótimo estado! RGB lindo e switches confortáveis. Fausto entregou rapidíssimo.', NOW() - INTERVAL 63 DAY),
(17, 15, @p20, @nped20, 5, 'Teclado excelente! Switches suaves e RGB incrível. Muito satisfeita com a compra.', NOW() - INTERVAL 20 DAY),
(12, 15, @p17, @nped21, 5, 'Controle PS4 em perfeito estado. Botões e analógicos sem desgaste. Ótima negociação!', NOW() - INTERVAL 36 DAY),
-- Gabriel (vendedor) — Corda e Mochila estreiam + extra
(4,  16, @p23, @nped22, 5, 'Corda de qualidade! Rolamento suave e handles confortáveis. Perfeita para os treinos matinais.', NOW() - INTERVAL 58 DAY),
(15, 16, @p23, @nped23, 5, 'Corda profissional mesmo! Velocidade incrível para o treino de boxe. Gabriel muito prestativo.', NOW() - INTERVAL 16 DAY),
(14, 16, @p24, @nped24, 4, 'Mochila em ótimo estado! 6 meses parece nova. Muito espaço interno. Uso para as aulas.', NOW() - INTERVAL 40 DAY),
(12, 16, @p24, @nped25, 5, 'Mochila Nike excelente! Costas acolchoadas e muitos bolsos. Negociação rápida.', NOW() - INTERVAL 13 DAY),
(11, 16, @p21, @nped26, 5, 'Halteres novos, emborrachamento de qualidade. Chegaram bem embalados. Recomendo!', NOW() - INTERVAL 28 DAY),
-- Gabriela (vendedora) — Kit Esmaltes estreia + perfume extra
(9,  17, @p28, @nped27, 5, 'Esmaltes artesanais lindos! Cores exclusivas e duração incrível. Comprei para mim e para minha mãe.', NOW() - INTERVAL 66 DAY),
(12, 17, @p28, @nped28, 5, 'Presenteei amigas e todas amaram! Qualidade vegana impecável. Já pedi mais!', NOW() - INTERVAL 43 DAY),
(4,  17, @p28, @nped29, 5, 'Kit lindo! Esmaltes com acabamento gel que duram muito. Cores únicas e produto vegano. Amei!', NOW() - INTERVAL 20 DAY),
(4,  17, @p26, @nped30, 5, 'Perfume suave e marcante! Fixação muito boa para um produto natural. Vou comprar sempre.', NOW() - INTERVAL 48 DAY);

-- ----------------------------------------------------------------
-- MÉTRICAS FINAIS CONSOLIDADAS
-- (old + new pedidos e avaliações)
--
-- ID 4  · vendas=11 · compras=10 · rating=4.82 (53/11)
-- ID 9  · vendas=9  · compras=9  · rating=4.78 (43/9)
-- ID 12 · vendas=7  · compras=8  · rating=4.86 (34/7)
-- ID 14 · vendas=5  · compras=5  · rating=4.60 (23/5)
-- ID 15 · vendas=6  · compras=4  · rating=4.83 (29/6)
-- ID 16 · vendas=8  · compras=3  · rating=4.75 (38/8)
-- ID 17 · vendas=7  · compras=6  · rating=4.86 (34/7)
-- ----------------------------------------------------------------
UPDATE usuarios SET rating = 4.82, total_vendas = 11, total_compras = 10 WHERE id = 4;
UPDATE usuarios SET rating = 4.78, total_vendas = 9,  total_compras = 9  WHERE id = 9;
UPDATE usuarios SET rating = 4.86, total_vendas = 7,  total_compras = 8  WHERE id = 12;
UPDATE usuarios SET rating = 4.60, total_vendas = 5,  total_compras = 5  WHERE id = 14;
UPDATE usuarios SET rating = 4.83, total_vendas = 6,  total_compras = 4  WHERE id = 15;
UPDATE usuarios SET rating = 4.75, total_vendas = 8,  total_compras = 3  WHERE id = 16;
UPDATE usuarios SET rating = 4.86, total_vendas = 7,  total_compras = 6  WHERE id = 17;

SET FOREIGN_KEY_CHECKS = 1;
