<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$db = getDB();

// GET - avaliações de um produto ou usuário
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $produtoId = isset($_GET['produto_id']) ? (int) $_GET['produto_id'] : null;
    $usuarioId = isset($_GET['usuario_id']) ? (int) $_GET['usuario_id'] : null;

    if (!$produtoId && !$usuarioId) respondError('produto_id ou usuario_id é obrigatório');

    if ($produtoId) {
        $stmt = $db->prepare(
            "SELECT a.id, a.nota, a.comentario, a.criado_em,
                    u.nome as avaliador_nome, u.foto_url as avaliador_foto
             FROM avaliacoes a JOIN usuarios u ON a.avaliador_id = u.id
             WHERE a.produto_id = ? ORDER BY a.criado_em DESC"
        );
        $stmt->execute([$produtoId]);
    } else {
        $stmt = $db->prepare(
            "SELECT a.id, a.nota, a.comentario, a.criado_em,
                    u.nome as avaliador_nome, u.foto_url as avaliador_foto
             FROM avaliacoes a JOIN usuarios u ON a.avaliador_id = u.id
             WHERE a.avaliado_id = ? ORDER BY a.criado_em DESC LIMIT 20"
        );
        $stmt->execute([$usuarioId]);
    }

    $avs   = $stmt->fetchAll();
    $media = count($avs) > 0 ? array_sum(array_column($avs, 'nota')) / count($avs) : 0;

    $podeAvaliar = false;
    $jaAvaliou   = false;

    // Verificar se o usuário logado pode avaliar este produto
    if ($produtoId && isset($_SESSION['user_id'])) {
        $userId = (int) $_SESSION['user_id'];

        // Tem pedido entregue deste produto?
        $comprou = $db->prepare(
            "SELECT id FROM pedidos WHERE comprador_id = ? AND produto_id = ? AND status = 'entregue' LIMIT 1"
        );
        $comprou->execute([$userId, $produtoId]);
        $podeAvaliar = (bool) $comprou->fetch();

        // Já avaliou?
        $avaliou = $db->prepare(
            "SELECT id FROM avaliacoes WHERE avaliador_id = ? AND produto_id = ? LIMIT 1"
        );
        $avaliou->execute([$userId, $produtoId]);
        $jaAvaliou = (bool) $avaliou->fetch();
    }

    respond([
        'avaliacoes'   => $avs,
        'media'        => round($media, 1),
        'total'        => count($avs),
        'pode_avaliar' => $podeAvaliar,
        'ja_avaliou'   => $jaAvaliou,
    ]);
}

// POST - criar avaliação
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = requireAuth();
    $body   = getBody();

    $avaliado  = (int) ($body['avaliado_id'] ?? 0);
    $nota      = (int) ($body['nota'] ?? 0);
    $comentario= trim($body['comentario'] ?? '');
    $produtoId = isset($body['produto_id']) ? (int) $body['produto_id'] : null;
    $pedidoId  = isset($body['pedido_id']) ? (int) $body['pedido_id'] : null;

    if (!$avaliado || $nota < 1 || $nota > 5) {
        respondError('avaliado_id e nota (1-5) são obrigatórios');
    }
    if ($avaliado === $userId) respondError('Você não pode avaliar a si mesmo');

    // Verificar se comprou e recebeu o produto
    if ($produtoId) {
        $comprou = $db->prepare(
            "SELECT id FROM pedidos WHERE comprador_id = ? AND produto_id = ? AND status = 'entregue' LIMIT 1"
        );
        $comprou->execute([$userId, $produtoId]);
        if (!$comprou->fetch()) {
            respondError('Você só pode avaliar produtos que comprou e recebeu.', 403);
        }

        // Evitar avaliação duplicada
        $jaAvaliou = $db->prepare(
            "SELECT id FROM avaliacoes WHERE avaliador_id = ? AND produto_id = ? LIMIT 1"
        );
        $jaAvaliou->execute([$userId, $produtoId]);
        if ($jaAvaliou->fetch()) {
            respondError('Você já avaliou este produto.', 409);
        }
    }

    $stmt = $db->prepare(
        "INSERT INTO avaliacoes (avaliador_id, avaliado_id, produto_id, pedido_id, nota, comentario)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$userId, $avaliado, $produtoId, $pedidoId, $nota, $comentario]);

    // Atualizar média do avaliado
    $media = $db->prepare("SELECT AVG(nota) FROM avaliacoes WHERE avaliado_id = ?");
    $media->execute([$avaliado]);
    $novaMedia = round((float) $media->fetchColumn(), 2);
    $db->prepare("UPDATE usuarios SET rating = ? WHERE id = ?")->execute([$novaMedia, $avaliado]);

    notificar($avaliado, 'avaliacao', 'Nova Avaliação', "Você recebeu uma avaliação de $nota estrelas.", '/Templates/perfil.html');

    respond(['message' => 'Avaliação enviada com sucesso'], 201);
}

respondError('Método não permitido', 405);
