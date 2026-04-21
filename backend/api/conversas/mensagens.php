<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId   = requireAuth();
$db       = getDB();
$convId   = (int) ($_GET['conversa_id'] ?? 0);

if (!$convId) respondError('conversa_id é obrigatório');

// Verificar que o usuário pertence à conversa
$check = $db->prepare("SELECT id FROM conversas WHERE id = ? AND (usuario1_id = ? OR usuario2_id = ?)");
$check->execute([$convId, $userId, $userId]);
if (!$check->fetch()) respondError('Conversa não encontrada', 404);

// GET - buscar mensagens
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Marcar como lidas
    $db->prepare(
        "UPDATE mensagens SET lida = 1 WHERE conversa_id = ? AND remetente_id != ?"
    )->execute([$convId, $userId]);

    $stmt = $db->prepare(
        "SELECT m.id, m.texto, m.lida, m.criado_em, m.remetente_id,
                u.nome as remetente_nome, u.foto_url as remetente_foto
         FROM mensagens m
         JOIN usuarios u ON m.remetente_id = u.id
         WHERE m.conversa_id = ?
         ORDER BY m.criado_em ASC"
    );
    $stmt->execute([$convId]);
    $msgs = $stmt->fetchAll();

    $result = array_map(function($m) use ($userId) {
        return [
            'id'        => (int) $m['id'],
            'texto'     => $m['texto'],
            'lida'      => (bool) $m['lida'],
            'criado_em' => $m['criado_em'],
            'tipo'      => (int) $m['remetente_id'] === $userId ? 'sent' : 'received',
            'remetente' => [
                'id'   => (int) $m['remetente_id'],
                'nome' => $m['remetente_nome'],
                'foto' => $m['remetente_foto'],
            ],
        ];
    }, $msgs);

    respond($result);
}

// POST - enviar mensagem
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body  = getBody();
    $texto = trim($body['texto'] ?? '');
    if (!$texto) respondError('Texto da mensagem é obrigatório');

    $stmt = $db->prepare(
        "INSERT INTO mensagens (conversa_id, remetente_id, texto) VALUES (?, ?, ?)"
    );
    $stmt->execute([$convId, $userId, $texto]);
    $msgId = (int) $db->lastInsertId();

    // Atualizar última mensagem na conversa
    $db->prepare(
        "UPDATE conversas SET ultima_mensagem = ?, ultima_mensagem_em = NOW() WHERE id = ?"
    )->execute([$texto, $convId]);

    // Notificar outro participante
    $outro = $db->prepare(
        "SELECT CASE WHEN usuario1_id = ? THEN usuario2_id ELSE usuario1_id END as outro_id FROM conversas WHERE id = ?"
    );
    $outro->execute([$userId, $convId]);
    $outroId = (int) $outro->fetchColumn();

    $nomeRemetente = $db->prepare("SELECT nome FROM usuarios WHERE id = ?");
    $nomeRemetente->execute([$userId]);
    $nome = $nomeRemetente->fetchColumn();

    notificar($outroId, 'mensagem', "Nova mensagem de $nome", $texto, '/Templates/mensagens.html');

    respond([
        'id'        => $msgId,
        'texto'     => $texto,
        'tipo'      => 'sent',
        'criado_em' => date('Y-m-d H:i:s'),
    ], 201);
}

respondError('Método não permitido', 405);
