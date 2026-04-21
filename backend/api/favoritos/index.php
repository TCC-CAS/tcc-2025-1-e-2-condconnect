<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

// GET - listar favoritos
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT p.id, p.titulo, p.descricao, p.preco, p.categoria, p.condicao,
                p.foto_principal as foto, u.nome as vendedor_nome,
                u.bloco as vendedor_bloco, u.apartamento as vendedor_apto,
                u.rating as vendedor_rating, u.total_vendas as vendedor_vendas
         FROM favoritos f
         JOIN produtos p ON f.produto_id = p.id
         JOIN usuarios u ON p.usuario_id = u.id
         WHERE f.usuario_id = ? AND p.status = 'disponivel'
         ORDER BY f.criado_em DESC"
    );
    $stmt->execute([$userId]);
    $favs = $stmt->fetchAll();

    $result = array_map(function($p) {
        return [
            'id'        => (int) $p['id'],
            'titulo'    => $p['titulo'],
            'descricao' => $p['descricao'],
            'preco'     => (float) $p['preco'],
            'preco_fmt' => 'R$ ' . number_format((float)$p['preco'], 2, ',', '.'),
            'categoria' => $p['categoria'],
            'condicao'  => $p['condicao'],
            'foto'      => $p['foto'] ?? '/static/assets/images/produto-placeholder.jpg',
            'favorito'  => true,
            'vendedor'  => [
                'nome'       => $p['vendedor_nome'],
                'localizacao'=> 'Bloco ' . $p['vendedor_bloco'] . ' - Apto ' . $p['vendedor_apto'],
                'rating'     => (float) $p['vendedor_rating'],
                'vendas'     => (int) $p['vendedor_vendas'],
            ],
        ];
    }, $favs);

    respond($result);
}

// POST - adicionar favorito
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body      = getBody();
    $produtoId = (int) ($body['produto_id'] ?? 0);
    if (!$produtoId) respondError('produto_id é obrigatório');

    $check = $db->prepare("SELECT id FROM produtos WHERE id = ?");
    $check->execute([$produtoId]);
    if (!$check->fetch()) respondError('Produto não encontrado', 404);

    $stmt = $db->prepare(
        "INSERT IGNORE INTO favoritos (usuario_id, produto_id) VALUES (?, ?)"
    );
    $stmt->execute([$userId, $produtoId]);

    respond(['message' => 'Adicionado aos favoritos', 'favorito' => true], 201);
}

// DELETE - remover favorito
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $produtoId = (int) ($_GET['produto_id'] ?? 0);
    if (!$produtoId) respondError('produto_id é obrigatório');

    $db->prepare("DELETE FROM favoritos WHERE usuario_id = ? AND produto_id = ?")->execute([$userId, $produtoId]);
    respond(['message' => 'Removido dos favoritos', 'favorito' => false]);
}

respondError('Método não permitido', 405);
