<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

// GET - listar carrinho
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT ic.id, ic.quantidade, p.id as produto_id, p.titulo, p.preco,
                p.foto_principal as foto, p.condicao, p.status,
                u.nome as vendedor_nome, u.bloco as vendedor_bloco, u.apartamento as vendedor_apto
         FROM itens_carrinho ic
         JOIN produtos p ON ic.produto_id = p.id
         JOIN usuarios u ON p.usuario_id = u.id
         WHERE ic.usuario_id = ?"
    );
    $stmt->execute([$userId]);
    $itens = $stmt->fetchAll();

    $result = array_map(function($i) {
        return [
            'id'         => (int) $i['id'],
            'quantidade' => (int) $i['quantidade'],
            'produto'    => [
                'id'         => (int) $i['produto_id'],
                'titulo'     => $i['titulo'],
                'preco'      => (float) $i['preco'],
                'preco_fmt'  => 'R$ ' . number_format((float)$i['preco'], 2, ',', '.'),
                'foto'       => $i['foto'] ?? '/static/assets/images/produto-placeholder.jpg',
                'condicao'   => $i['condicao'],
                'status'     => $i['status'],
                'localizacao'=> 'Bloco ' . $i['vendedor_bloco'] . ' - Apto ' . $i['vendedor_apto'],
                'vendedor'   => $i['vendedor_nome'],
            ],
        ];
    }, $itens);

    $subtotal = array_reduce($result, fn($s, $i) => $s + $i['produto']['preco'] * $i['quantidade'], 0);

    respond([
        'itens'    => $result,
        'subtotal' => $subtotal,
        'total'    => $subtotal,
        'total_fmt'=> 'R$ ' . number_format($subtotal, 2, ',', '.'),
    ]);
}

// POST - adicionar ao carrinho
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body       = getBody();
    $produtoId  = (int) ($body['produto_id'] ?? 0);
    $quantidade = max(1, (int) ($body['quantidade'] ?? 1));

    if (!$produtoId) respondError('produto_id é obrigatório');

    // Verificar produto existe e está disponível
    $prod = $db->prepare("SELECT id, usuario_id, status FROM produtos WHERE id = ?");
    $prod->execute([$produtoId]);
    $produto = $prod->fetch();

    if (!$produto) respondError('Produto não encontrado', 404);
    if ($produto['status'] !== 'disponivel') respondError('Produto não está disponível');
    if ((int) $produto['usuario_id'] === $userId) respondError('Você não pode adicionar seu próprio produto ao carrinho');

    // Upsert
    $stmt = $db->prepare(
        "INSERT INTO itens_carrinho (usuario_id, produto_id, quantidade)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantidade = quantidade + VALUES(quantidade)"
    );
    $stmt->execute([$userId, $produtoId, $quantidade]);

    respond(['message' => 'Produto adicionado ao carrinho'], 201);
}

// PUT - atualizar quantidade
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body       = getBody();
    $itemId     = (int) ($body['item_id'] ?? 0);
    $quantidade = (int) ($body['quantidade'] ?? 0);

    if (!$itemId) respondError('item_id é obrigatório');

    if ($quantidade < 1) {
        $db->prepare("DELETE FROM itens_carrinho WHERE id = ? AND usuario_id = ?")->execute([$itemId, $userId]);
        respond(['message' => 'Item removido do carrinho']);
    }

    $db->prepare("UPDATE itens_carrinho SET quantidade = ? WHERE id = ? AND usuario_id = ?")->execute([$quantidade, $itemId, $userId]);
    respond(['message' => 'Quantidade atualizada']);
}

// DELETE - remover item ou limpar carrinho
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $itemId = (int) ($_GET['item_id'] ?? 0);
    if ($itemId) {
        $db->prepare("DELETE FROM itens_carrinho WHERE id = ? AND usuario_id = ?")->execute([$itemId, $userId]);
        respond(['message' => 'Item removido do carrinho']);
    }
    // Limpar tudo
    $db->prepare("DELETE FROM itens_carrinho WHERE usuario_id = ?")->execute([$userId]);
    respond(['message' => 'Carrinho limpo']);
}

respondError('Método não permitido', 405);
