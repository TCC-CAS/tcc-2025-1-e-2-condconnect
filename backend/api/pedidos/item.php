<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();
$id     = (int) ($_GET['id'] ?? 0);
if (!$id) respondError('ID do pedido inválido');

// GET - detalhes do pedido
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT p.*, pr.titulo, pr.foto_principal, pr.categoria,
                uc.nome as comprador_nome, uc.bloco as comprador_bloco, uc.apartamento as comprador_apto,
                uv.nome as vendedor_nome, uv.bloco as vendedor_bloco, uv.apartamento as vendedor_apto
         FROM pedidos p
         JOIN produtos pr ON p.produto_id = pr.id
         JOIN usuarios uc ON p.comprador_id = uc.id
         JOIN usuarios uv ON p.vendedor_id = uv.id
         WHERE p.id = ? AND (p.comprador_id = ? OR p.vendedor_id = ?)"
    );
    $stmt->execute([$id, $userId, $userId]);
    $pedido = $stmt->fetch();

    if (!$pedido) respondError('Pedido não encontrado', 404);

    respond([
        'id'         => (int) $pedido['id'],
        'id_fmt'     => 'CC-' . str_pad($pedido['id'], 5, '0', STR_PAD_LEFT),
        'status'     => $pedido['status'],
        'preco_total'=> (float) $pedido['preco_total'],
        'preco_fmt'  => number_format((float)$pedido['preco_total'], 2, ',', '.'),
        'quantidade' => (int) $pedido['quantidade'],
        'criado_em'  => $pedido['criado_em'],
        'produto'    => ['titulo' => $pedido['titulo'], 'foto' => $pedido['foto_principal'], 'categoria' => $pedido['categoria']],
        'comprador'  => ['nome' => $pedido['comprador_nome'], 'localizacao' => 'Bloco ' . $pedido['comprador_bloco'] . ' - Apto ' . $pedido['comprador_apto']],
        'vendedor'   => ['nome' => $pedido['vendedor_nome'], 'localizacao' => 'Bloco ' . $pedido['vendedor_bloco'] . ' - Apto ' . $pedido['vendedor_apto']],
    ]);
}

// PUT - atualizar status
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body   = getBody();
    $status = $body['status'] ?? '';

    $validos = ['confirmado', 'enviado', 'entregue', 'cancelado'];
    if (!in_array($status, $validos)) respondError('Status inválido');

    // Apenas vendedor pode confirmar/enviar; comprador pode cancelar/confirmar entrega
    $own = $db->prepare("SELECT comprador_id, vendedor_id FROM pedidos WHERE id = ?");
    $own->execute([$id]);
    $pedido = $own->fetch();
    if (!$pedido) respondError('Pedido não encontrado', 404);

    if ((int) $pedido['comprador_id'] !== $userId && (int) $pedido['vendedor_id'] !== $userId) {
        respondError('Sem permissão', 403);
    }

    $db->prepare("UPDATE pedidos SET status = ? WHERE id = ?")->execute([$status, $id]);

    $outroId = (int) $pedido['comprador_id'] === $userId ? (int) $pedido['vendedor_id'] : (int) $pedido['comprador_id'];
    $labels  = ['confirmado' => 'Pedido Confirmado', 'enviado' => 'Pedido Enviado', 'entregue' => 'Pedido Entregue', 'cancelado' => 'Pedido Cancelado'];
    notificar($outroId, 'pedido', $labels[$status] ?? 'Atualização de Pedido', 'Status do pedido atualizado.', '/Templates/meus-pedidos.html');

    respond(['message' => 'Status atualizado']);
}

respondError('Método não permitido', 405);
