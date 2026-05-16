-- ================================================================
-- CondConnect – Dados fictícios para demonstração
-- Vendedores: IDs 4, 9, 12, 14, 15, 16, 17
-- Execute este script no banco engenharia_16
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- PERFIS DOS VENDEDORES
-- ----------------------------------------------------------------
UPDATE usuarios SET
    bio = 'Moradora do condomínio há 5 anos. Faço doces artesanais por encomenda: brigadeiros, bolos e salgados para festas e eventos. Produtos feitos com amor e ingredientes de qualidade!',
    pix_key = 'anafranchi04@gmail.com'
WHERE id = 4;

UPDATE usuarios SET
    bio = 'Artesã apaixonada por crochê, macramê e pintura. Cada peça é única e feita com muito carinho. Aceito encomendas personalizadas!',
    pix_key = 'beatriz@gmail.com'
WHERE id = 9;

UPDATE usuarios SET
    bio = 'Estudante de Sistemas de Informação e entusiasta de tecnologia e jogos de tabuleiro. Vendo itens seminovos com ótimo custo-benefício. Entregas rápidas!',
    pix_key = 'meneguinibruno@gmail.com'
WHERE id = 12;

UPDATE usuarios SET
    bio = 'Músico e professor de violão há 15 anos. Ensino todos os estilos: MPB, samba, sertanejo e bossa nova. Aulas para todas as idades!',
    pix_key = '11955551014'
WHERE id = 14;

UPDATE usuarios SET
    bio = 'Apaixonado por tecnologia e games. Vendo eletrônicos seminovos com procedência garantida. Preços justos e produtos testados!',
    pix_key = 'condconnect382@gmail.com'
WHERE id = 15;

UPDATE usuarios SET
    bio = 'Personal trainer e entusiasta de fitness. Vendo equipamentos de treino e itens esportivos. Foco em saúde e qualidade de vida!',
    pix_key = 'gabrielhenrique180202@gmail.com'
WHERE id = 16;

UPDATE usuarios SET
    bio = 'Esteticista e criadora de cosméticos naturais artesanais. Produtos veganos, cruelty-free e feitos com amor para cuidar de você!',
    pix_key = 'ferrarigabriela31@gmail.com'
WHERE id = 17;

-- ----------------------------------------------------------------
-- PRODUTOS — Ana Luiza (ID 4) · Doces Artesanais
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(4, 'Brigadeiro Gourmet', 'Brigadeiros artesanais feitos com chocolate belga 70% cacau e granulado crocante. Perfeitos para festas e presentes. Vendidos por unidade — peça seu kit!', 5.00, 2.50, 'Alimentos', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&q=80', 87, NOW() - INTERVAL 45 DAY);
SET @p1 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(4, 'Bolo de Leite Ninho com Morango', 'Bolo com recheio generoso de Leite Ninho e morango fresco, cobertura de chantilly. Serve 15 pessoas. Encomende com 48h de antecedência.', 95.00, 42.00, 'Alimentos', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', 134, NOW() - INTERVAL 60 DAY);
SET @p2 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(4, 'Coxinha de Frango com Catupiry', 'Coxinha caseira com massa sequinha e recheio cremoso de frango desfiado com catupiry. Pacote com 10 unidades. Encomende com 24h de antecedência.', 42.00, 18.00, 'Alimentos', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80', 62, NOW() - INTERVAL 30 DAY);
SET @p3 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(4, 'Kit 20 Brigadeiros Sortidos', 'Kit especial com 20 brigadeiros: chocolate belga, pistache, churros, limão siciliano e maracujá. Embalagem de presente inclusa. Ideal para chás e eventos.', 98.00, 45.00, 'Alimentos', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80', 203, NOW() - INTERVAL 20 DAY);
SET @p4 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- PRODUTOS — Beatriz Franchi (ID 9) · Artesanato
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(9, 'Pulseira de Macramê Boho', 'Pulseira feita à mão com fios de algodão natural. Design boho com miçangas douradas. Tamanho ajustável. Disponível em branco, bege e colorida.', 38.00, 12.00, 'Artesanato', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80', 95, NOW() - INTERVAL 55 DAY);
SET @p5 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(9, 'Vaso de Crochê Decorativo', 'Vaso em crochê de algodão com vaso plástico interno incluso. Ideal para plantas pequenas ou uso decorativo. Altura: 18cm.', 65.00, 22.00, 'Artesanato', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', 78, NOW() - INTERVAL 40 DAY);
SET @p6 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(9, 'Quadro Decorativo em Tela — Abstrato', 'Pintura em tela 30x40cm com tintas acrílicas. Arte abstrata em tons de terracota, ocre e off-white. Cada peça é única e assinada. Acompanha suporte.', 120.00, 38.00, 'Artesanato', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80', 112, NOW() - INTERVAL 35 DAY);
SET @p7 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(9, 'Porta-Velas de Macramê', 'Suporte para vela em macramê com fios bege natural. Cria atmosfera aconchegante. Suporta velas de até 8cm de diâmetro.', 45.00, 14.00, 'Artesanato', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80', 56, NOW() - INTERVAL 15 DAY);
SET @p8 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- PRODUTOS — Bruno Henrique Meneguini (ID 12) · Tecnologia & Jogos
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(12, 'Jogo de Tabuleiro — Catan', 'Catan edição base em ótimo estado. Todas as peças presentes e caixa íntegra. Clássico da estratégia para 3–4 jogadores. Diversão garantida para a família!', 140.00, NULL, 'Entretenimento', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=600&q=80', 98, NOW() - INTERVAL 50 DAY);
SET @p9 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(12, 'Coleção Harry Potter — 7 Volumes', 'Coleção completa Harry Potter, edição Rocco capa dura. Livros em ótimo estado de conservação. Perfeita para presentear ou completar a coleção.', 280.00, NULL, 'Livros', 'Usado', 'disponivel', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80', 145, NOW() - INTERVAL 35 DAY);
SET @p10 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(12, 'Smartwatch Xiaomi Mi Band 7', 'Pulseira inteligente Xiaomi Mi Band 7 com tela AMOLED 1.62". Monitor de frequência cardíaca, SpO2 e 110 modos esportivos. Excelente estado, pulseira extra inclusa.', 175.00, NULL, 'Eletrônicos', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=600&q=80', 212, NOW() - INTERVAL 22 DAY);
SET @p11 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(12, 'Monitor LG 22" Full HD IPS', 'Monitor LG 22MK430H, Full HD 1080p, painel IPS, HDMI e VGA. Imagem nítida e cores fiéis. Funcionando perfeitamente. Vendendo por upgrade de setup.', 420.00, NULL, 'Eletrônicos', 'Usado', 'disponivel', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80', 187, NOW() - INTERVAL 12 DAY);
SET @p12 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- PRODUTOS — Zeca Pagodinho (ID 14) · Música
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(14, 'Violão Nylon Yamaha C40', 'Violão clássico Yamaha C40. Ótimo para iniciantes. Som encorpado, afinação estável. Acompanha bag e capotraste. Pequeno arranhão estético na lateral.', 320.00, NULL, 'Eletrônicos', 'Usado', 'disponivel', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80', 241, NOW() - INTERVAL 80 DAY);
SET @p14 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(14, 'Gaita Cromática Hohner 10 Furos', 'Gaita Hohner 10 furos em Dó. Excelente estado. Estojo original incluso. Ideal para samba e sertanejo.', 85.00, NULL, 'Eletrônicos', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=600&q=80', 52, NOW() - INTERVAL 30 DAY);
SET @p15 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(14, 'Coletânea MPB Clássica — 50 Partituras', 'Livro com 50 partituras e cifras de MPB: Chico Buarque, Caetano Veloso e Milton Nascimento. Capa dura, 180 páginas. Novo, sem uso.', 38.00, NULL, 'Livros', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80', 34, NOW() - INTERVAL 12 DAY);
SET @p16 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- PRODUTOS — Fausto Silva (ID 15) · Eletrônicos
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(15, 'Controle PS4 DualShock 4 — Preto', 'Controle PlayStation 4 original Sony. Analógicos e botões perfeitos. Cabo USB incluso. Testado e funcionando 100%.', 185.00, NULL, 'Eletrônicos', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&q=80', 312, NOW() - INTERVAL 45 DAY);
SET @p17 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(15, 'Fone Bluetooth JBL Tune 510BT', 'Fone JBL sem fio com 40h de autonomia, Sound Pure Bass e USB-C. Excelente estado, caixa original.', 199.00, NULL, 'Eletrônicos', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', 276, NOW() - INTERVAL 38 DAY);
SET @p18 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(15, 'Mouse Gamer Logitech G203', 'Mouse gamer RGB, 6 botões programáveis, DPI até 8000. Perfeito estado. Vendendo por upgrade de modelo.', 115.00, NULL, 'Eletrônicos', 'Usado', 'disponivel', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&q=80', 198, NOW() - INTERVAL 22 DAY);
SET @p19 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(15, 'Teclado Mecânico Redragon K552', 'Teclado mecânico compacto TKL com switches Red e RGB completo. Construção em metal. Ótimo estado.', 270.00, NULL, 'Eletrônicos', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80', 153, NOW() - INTERVAL 15 DAY);
SET @p20 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- PRODUTOS — Gabriel Henrique (ID 16) · Esportes
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(16, 'Par de Halteres 5kg — Emborrachados', 'Halteres 5kg revestidos de borracha antiderrapante. Pegada anatômica. Ideais para treino em casa. Novos na embalagem.', 180.00, 120.00, 'Esporte', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80', 167, NOW() - INTERVAL 55 DAY);
SET @p21 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(16, 'Tapete de Yoga Premium 6mm', 'Tapete yoga antiderrapante, 183cm, material TPE ecológico livre de PVC. Alça de transporte inclusa. Cor azul.', 95.00, 55.00, 'Esporte', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80', 122, NOW() - INTERVAL 42 DAY);
SET @p22 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(16, 'Corda de Pular Speed Profissional', 'Corda speed com rolamento de precisão e handles ergonômicos. Cabo de aço revestido. Ajustável. Ideal para crossfit e funcional.', 58.00, 28.00, 'Esporte', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=600&q=80', 89, NOW() - INTERVAL 28 DAY);
SET @p23 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(16, 'Mochila Esportiva Nike 30L', 'Mochila Nike com compartimento principal, bolso frontal e lateral para garrafa. Costas acolchoadas. 6 meses de uso. Cor preta.', 130.00, NULL, 'Esporte', 'Seminovo', 'disponivel', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80', 74, NOW() - INTERVAL 8 DAY);
SET @p24 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- PRODUTOS — Gabriela Ferrari Sobral (ID 17) · Beleza
-- ----------------------------------------------------------------
INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(17, 'Kit Skincare Completo — Pele Seca', 'Kit com sabonete facial hidratante, tônico calmante, sérum vitamina C e hidratante FPS 30. Todos veganos e cruelty-free.', 165.00, 78.00, 'Beleza', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80', 234, NOW() - INTERVAL 65 DAY);
SET @p25 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(17, 'Perfume Artesanal — Flor de Cerejeira', 'Perfume artesanal 50ml. Notas de cerejeira, jasmim e almíscar branco. Longa duração, base d\'água. Frasco de vidro com tampa dourada.', 88.00, 32.00, 'Beleza', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?w=600&q=80', 188, NOW() - INTERVAL 48 DAY);
SET @p26 = LAST_INSERT_ID();

INSERT INTO produtos (usuario_id, titulo, descricao, preco, custo, categoria, condicao, status, foto_principal, visualizacoes, criado_em) VALUES
(17, 'Kit 6 Esmaltes Artesanais', 'Kit com 6 esmaltes artesanais, acabamento gel, cores exclusivas e pigmentação intensa. Livres de tolueno, formol e DBP. Duram até 10 dias.', 29.00, 10.00, 'Beleza', 'Novo', 'disponivel', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80', 97, NOW() - INTERVAL 20 DAY);
SET @p28 = LAST_INSERT_ID();

-- ----------------------------------------------------------------
-- IMAGENS EXTRAS
-- ----------------------------------------------------------------
INSERT INTO imagens_produto (produto_id, url, ordem) VALUES
(@p1,  'https://images.unsplash.com/photo-1582056040528-4aad5a99ac5d?w=600&q=80', 1),
(@p2,  'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80', 1),
(@p4,  'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&q=80', 1),
(@p7,  'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&q=80', 1),
(@p9,  'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80', 1),
(@p18, 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&q=80', 1),
(@p25, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80', 1),
(@p26, 'https://images.unsplash.com/photo-1588514912908-fb1793c5e929?w=600&q=80', 1);

-- ----------------------------------------------------------------
-- INSUMOS (composição de custos)
-- ----------------------------------------------------------------
-- Ana Luiza — Brigadeiro Gourmet (custo: R$2,50)
INSERT INTO produto_insumos (produto_id, nome, quantidade, unidade, custo) VALUES
(@p1, 'Chocolate belga 70%', 100, 'g', 1.20),
(@p1, 'Leite condensado', 50, 'g', 0.70),
(@p1, 'Granulado crocante', 20, 'g', 0.35),
(@p1, 'Manteiga', 10, 'g', 0.25);

-- Ana Luiza — Kit 20 Brigadeiros (custo: R$45,00)
INSERT INTO produto_insumos (produto_id, nome, quantidade, unidade, custo) VALUES
(@p4, 'Chocolate belga 70%', 2000, 'g', 24.00),
(@p4, 'Leite condensado', 1000, 'g', 14.00),
(@p4, 'Coberturas variadas', 400, 'g', 5.00),
(@p4, 'Embalagem de presente', 1, 'un', 2.00);

-- Gabriela — Kit Skincare (custo: R$78,00)
INSERT INTO produto_insumos (produto_id, nome, quantidade, unidade, custo) VALUES
(@p25, 'Sabonete facial hidratante', 1, 'un', 18.00),
(@p25, 'Tônico calmante', 1, 'un', 15.00),
(@p25, 'Sérum vitamina C', 1, 'un', 28.00),
(@p25, 'Hidratante FPS 30', 1, 'un', 17.00);

-- Gabriela — Perfume Artesanal (custo: R$32,00)
INSERT INTO produto_insumos (produto_id, nome, quantidade, unidade, custo) VALUES
(@p26, 'Fixador de fragrância', 30, 'ml', 12.00),
(@p26, 'Óleo de cerejeira', 10, 'ml', 9.00),
(@p26, 'Óleo de jasmim', 5, 'ml', 6.50),
(@p26, 'Frasco de vidro 50ml', 1, 'un', 4.50);

-- ----------------------------------------------------------------
-- PEDIDOS ENTREGUES (histórico de vendas)
-- ----------------------------------------------------------------
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 4, @p1, 10, 50.00, 'entregue', NOW() - INTERVAL 85 DAY);
SET @ped1 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 4, @p2, 1, 95.00, 'entregue', NOW() - INTERVAL 72 DAY);
SET @ped2 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(17, 4, @p4, 1, 98.00, 'entregue', NOW() - INTERVAL 65 DAY);
SET @ped3 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 4, @p3, 1, 42.00, 'entregue', NOW() - INTERVAL 58 DAY);
SET @ped4 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(16, 4, @p1, 20, 100.00, 'entregue', NOW() - INTERVAL 50 DAY);
SET @ped5 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(5, 4, @p1, 15, 75.00, 'entregue', NOW() - INTERVAL 42 DAY);
SET @ped6 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 9, @p5, 2, 76.00, 'entregue', NOW() - INTERVAL 80 DAY);
SET @ped7 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 9, @p6, 1, 65.00, 'entregue', NOW() - INTERVAL 68 DAY);
SET @ped8 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(17, 9, @p7, 1, 120.00, 'entregue', NOW() - INTERVAL 55 DAY);
SET @ped9 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(6, 9, @p7, 1, 120.00, 'entregue', NOW() - INTERVAL 48 DAY);
SET @ped10 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 12, @p11, 1, 175.00, 'entregue', NOW() - INTERVAL 75 DAY);
SET @ped11 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 12, @p9, 1, 140.00, 'entregue', NOW() - INTERVAL 60 DAY);
SET @ped12 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(16, 12, @p10, 1, 280.00, 'entregue', NOW() - INTERVAL 45 DAY);
SET @ped13 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(16, 14, @p14, 1, 320.00, 'entregue', NOW() - INTERVAL 78 DAY);
SET @ped15 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 15, @p17, 1, 185.00, 'entregue', NOW() - INTERVAL 85 DAY);
SET @ped16 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(12, 15, @p18, 1, 199.00, 'entregue', NOW() - INTERVAL 70 DAY);
SET @ped17 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(14, 15, @p19, 1, 115.00, 'entregue', NOW() - INTERVAL 55 DAY);
SET @ped18 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 16, @p21, 1, 180.00, 'entregue', NOW() - INTERVAL 80 DAY);
SET @ped20 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(17, 16, @p22, 1, 95.00, 'entregue', NOW() - INTERVAL 62 DAY);
SET @ped21 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(13, 16, @p21, 1, 180.00, 'entregue', NOW() - INTERVAL 35 DAY);
SET @ped22 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(4, 17, @p25, 1, 165.00, 'entregue', NOW() - INTERVAL 88 DAY);
SET @ped23 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(9, 17, @p26, 1, 88.00, 'entregue', NOW() - INTERVAL 72 DAY);
SET @ped24 = LAST_INSERT_ID();

INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(7, 17, @p26, 1, 88.00, 'entregue', NOW() - INTERVAL 30 DAY);
SET @ped26 = LAST_INSERT_ID();

-- Pedidos em andamento (recentes)
INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total, status, criado_em) VALUES
(14, 4, @p2, 1, 95.00, 'enviado', NOW() - INTERVAL 3 DAY),
(4, 15, @p20, 1, 270.00, 'confirmado', NOW() - INTERVAL 2 DAY),
(12, 16, @p22, 1, 95.00, 'aguardando', NOW() - INTERVAL 6 HOUR);

-- ----------------------------------------------------------------
-- AVALIAÇÕES
-- ----------------------------------------------------------------
INSERT INTO avaliacoes (avaliador_id, avaliado_id, produto_id, pedido_id, nota, comentario, criado_em) VALUES
(9,  4, @p1, @ped1, 5, 'Brigadeiros maravilhosos! Chocolate de altíssima qualidade, derretem na boca. Super recomendo!', NOW() - INTERVAL 83 DAY),
(9,  4, @p2, @ped2, 5, 'Bolo perfeito! Recheio generoso e decoração linda. Toda a família amou. Vou pedir de novo!', NOW() - INTERVAL 70 DAY),
(17, 4, @p4, @ped3, 5, 'Kit incrível! Os brigadeiros de pistache são os melhores que já comi. Embalagem lindíssima.', NOW() - INTERVAL 63 DAY),
(12, 4, @p3, @ped4, 4, 'Coxinhas gostosas e bem recheadas. Entrega pontual. Poderiam vir um pouco mais quentes.', NOW() - INTERVAL 56 DAY),
(16, 4, @p1, @ped5, 5, 'Pedi para a festinha e todo mundo adorou! Atendimento da Ana impecável.', NOW() - INTERVAL 48 DAY),
(5,  4, @p1, @ped6, 5, 'Perfeitos para a festa! Todo mundo perguntou onde comprei. Brigadeiros diferenciados!', NOW() - INTERVAL 40 DAY),
(4,  9, @p5, @ped7, 5, 'Pulseiras lindíssimas e bem feitas. Presentei uma amiga e ela adorou!', NOW() - INTERVAL 78 DAY),
(12, 9, @p6, @ped8, 4, 'Vaso muito fofo, ficou lindo na sala. Só achei o prazo de entrega um pouco longo.', NOW() - INTERVAL 66 DAY),
(17, 9, @p7, @ped9, 5, 'Quadro incrível! Combinação de cores perfeita, cada detalhe é único. Arte de verdade!', NOW() - INTERVAL 53 DAY),
(6,  9, @p7, @ped10, 5, 'Quadro lindo demais! Parece que foi feito especialmente para minha sala.', NOW() - INTERVAL 46 DAY),
(4,  12, @p11, @ped11, 5, 'Smartwatch incrível! Veio em perfeito estado, exatamente como descrito. Entrega rápida. Super recomendo o Bruno!', NOW() - INTERVAL 73 DAY),
(9,  12, @p9,  @ped12, 5, 'Catan em ótimo estado, todas as peças presentes. Vendedor honesto e comunicativo. Já jogamos várias vezes!', NOW() - INTERVAL 58 DAY),
(16, 12, @p10, @ped13, 4, 'Coleção Harry Potter bem conservada. Só faltou um marcador de páginas. Ótimo negócio pelo preço!', NOW() - INTERVAL 43 DAY),
(16, 14, @p14, @ped15, 4, 'Violão em ótimo estado como descrito. Arranhão é imperceptível. Ótimo negócio!', NOW() - INTERVAL 76 DAY),
(4,  15, @p17, @ped16, 5, 'Controle perfeito! Parece novo. Vendedor super honesto e comunicativo.', NOW() - INTERVAL 83 DAY),
(12, 15, @p18, @ped17, 5, 'Fone incrível, som de qualidade e bateria que dura mesmo. Super feliz com a compra!', NOW() - INTERVAL 68 DAY),
(14, 15, @p19, @ped18, 4, 'Mouse ótimo, RGB bonito. Entrega rápida e bem embalado. Recomendo!', NOW() - INTERVAL 53 DAY),
(9,  16, @p21, @ped20, 5, 'Halteres novos mesmo! Embalagem original, produto de qualidade. Chegou super rápido.', NOW() - INTERVAL 78 DAY),
(17, 16, @p22, @ped21, 5, 'Tapete incrível, aderência perfeita e bem grosso. Já melhorou muito minha prática de yoga!', NOW() - INTERVAL 60 DAY),
(13, 16, @p21, @ped22, 4, 'Halteres de qualidade, emborrachamento bom. Entrega dentro do prazo.', NOW() - INTERVAL 33 DAY),
(4,  17, @p25, @ped23, 5, 'Kit completo e de ótima qualidade! A pele ficou muito mais hidratada já na primeira semana. Amei!', NOW() - INTERVAL 86 DAY),
(9,  17, @p26, @ped24, 5, 'Perfume maravilhoso! Fixação excelente e aroma delicado. Recebi vários elogios. Comprarei mais!', NOW() - INTERVAL 70 DAY),
(7,  17, @p26, @ped26, 4, 'Perfume suave e delicado, exatamente o que queria. Embalagem bonita. Recomendo!', NOW() - INTERVAL 28 DAY);

-- ----------------------------------------------------------------
-- FAVORITOS
-- ----------------------------------------------------------------
INSERT IGNORE INTO favoritos (usuario_id, produto_id, criado_em) VALUES
(4,  @p17, NOW() - INTERVAL 30 DAY),
(4,  @p25, NOW() - INTERVAL 25 DAY),
(4,  @p6,  NOW() - INTERVAL 20 DAY),
(9,  @p25, NOW() - INTERVAL 28 DAY),
(9,  @p1,  NOW() - INTERVAL 22 DAY),
(9,  @p22, NOW() - INTERVAL 15 DAY),
(12, @p1,  NOW() - INTERVAL 35 DAY),
(12, @p25, NOW() - INTERVAL 18 DAY),
(14, @p18, NOW() - INTERVAL 20 DAY),
(14, @p21, NOW() - INTERVAL 12 DAY),
(15, @p7,  NOW() - INTERVAL 25 DAY),
(15, @p2,  NOW() - INTERVAL 10 DAY),
(16, @p25, NOW() - INTERVAL 22 DAY),
(16, @p4,  NOW() - INTERVAL 8 DAY),
(17, @p21, NOW() - INTERVAL 18 DAY),
(17, @p2,  NOW() - INTERVAL 5 DAY),
(5,  @p1,  NOW() - INTERVAL 20 DAY),
(6,  @p7,  NOW() - INTERVAL 15 DAY),
(8,  @p9,  NOW() - INTERVAL 8 DAY),
(11, @p25, NOW() - INTERVAL 3 DAY);

-- ----------------------------------------------------------------
-- MÉTRICAS DOS USUÁRIOS
-- ----------------------------------------------------------------
-- rating  = média real das notas recebidas nas avaliacoes
-- total_vendas  = pedidos entregues onde usuario é vendedor_id
-- total_compras = pedidos entregues onde usuario é comprador_id
-- ID 4:  comprador em ped7,ped11,ped16,ped23 = 4 compras
-- ID 9:  comprador em ped1,ped2,ped12,ped20,ped24 = 5 compras
-- ID 12: comprador em ped4,ped8,ped17 = 3 compras
-- ID 14: comprador em ped18 = 1 compra
-- ID 15: sem compras entregues = 0 compras
-- ID 16: comprador em ped5,ped13,ped15 = 3 compras
-- ID 17: comprador em ped3,ped9,ped21 = 3 compras
UPDATE usuarios SET rating = 4.83, total_vendas = 6,  total_compras = 4 WHERE id = 4;
UPDATE usuarios SET rating = 4.75, total_vendas = 4,  total_compras = 5 WHERE id = 9;
UPDATE usuarios SET rating = 4.67, total_vendas = 3,  total_compras = 3 WHERE id = 12;
UPDATE usuarios SET rating = 4.00, total_vendas = 1,  total_compras = 1 WHERE id = 14;
UPDATE usuarios SET rating = 4.75, total_vendas = 4,  total_compras = 0 WHERE id = 15;
UPDATE usuarios SET rating = 4.67, total_vendas = 3,  total_compras = 3 WHERE id = 16;
UPDATE usuarios SET rating = 4.67, total_vendas = 3,  total_compras = 3 WHERE id = 17;

SET FOREIGN_KEY_CHECKS = 1;
