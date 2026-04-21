<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();
requireAdmin();

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT r.id, r.tipo, r.alvo_id, r.motivo, r.descricao, r.status, r.criado_em,
                u.nome as reporter_nome, u.email as reporter_email
         FROM relatorios r JOIN usuarios u ON r.reporter_id = u.id
         ORDER BY r.criado_em DESC"
    );
    $stmt->execute();
    respond($stmt->fetchAll());
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body   = getBody();
    $id     = (int) ($body['id'] ?? 0);
    $status = $body['status'] ?? '';

    if (!$id || !in_array($status, ['resolvido', 'rejeitado'])) {
        respondError('id e status (resolvido|rejeitado) são obrigatórios');
    }

    $db->prepare("UPDATE relatorios SET status = ? WHERE id = ?")->execute([$status, $id]);
    respond(['message' => 'Relatório atualizado']);
}

respondError('Método não permitido', 405);
