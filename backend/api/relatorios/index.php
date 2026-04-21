<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body      = getBody();
    $tipo      = $body['tipo'] ?? '';
    $alvoId    = (int) ($body['alvo_id'] ?? 0);
    $motivo    = trim($body['motivo'] ?? '');
    $descricao = trim($body['descricao'] ?? '');

    if (!in_array($tipo, ['produto', 'usuario']) || !$alvoId || !$motivo) {
        respondError('tipo, alvo_id e motivo são obrigatórios');
    }

    $stmt = $db->prepare(
        "INSERT INTO relatorios (reporter_id, tipo, alvo_id, motivo, descricao) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([$userId, $tipo, $alvoId, $motivo, $descricao]);

    respond(['message' => 'Denúncia registrada. Nossa equipe irá analisar em breve.'], 201);
}

respondError('Método não permitido', 405);
