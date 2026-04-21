<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

// GET - listar conversas do usuário
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT c.id, c.ultima_mensagem, c.ultima_mensagem_em, c.produto_id,
                CASE WHEN c.usuario1_id = ? THEN c.usuario2_id ELSE c.usuario1_id END as outro_id,
                CASE WHEN c.usuario1_id = ? THEN u2.nome ELSE u1.nome END as outro_nome,
                CASE WHEN c.usuario1_id = ? THEN u2.foto_url ELSE u1.foto_url END as outro_foto,
                (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id AND m.remetente_id != ? AND m.lida = 0) as nao_lidas
         FROM conversas c
         JOIN usuarios u1 ON c.usuario1_id = u1.id
         JOIN usuarios u2 ON c.usuario2_id = u2.id
         WHERE c.usuario1_id = ? OR c.usuario2_id = ?
         ORDER BY c.ultima_mensagem_em DESC"
    );
    $stmt->execute([$userId, $userId, $userId, $userId, $userId, $userId]);
    $convs = $stmt->fetchAll();

    $result = array_map(function($c) {
        $nome = $c['outro_nome'];
        $partes = explode(' ', $nome);
        $avatar = strtoupper(substr($partes[0], 0, 1) . (isset($partes[1]) ? substr($partes[1], 0, 1) : ''));
        return [
            'id'              => (int) $c['id'],
            'outro_usuario'   => [
                'id'     => (int) $c['outro_id'],
                'nome'   => $c['outro_nome'],
                'foto'   => $c['outro_foto'],
                'avatar' => $avatar,
            ],
            'ultima_mensagem'    => $c['ultima_mensagem'],
            'ultima_mensagem_em' => $c['ultima_mensagem_em'],
            'nao_lidas'          => (int) $c['nao_lidas'],
            'produto_id'         => $c['produto_id'] ? (int) $c['produto_id'] : null,
        ];
    }, $convs);

    respond($result);
}

// POST - iniciar ou obter conversa com outro usuário
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body      = getBody();
    $outroId   = (int) ($body['usuario_id'] ?? 0);
    $produtoId = isset($body['produto_id']) ? (int) $body['produto_id'] : null;

    if (!$outroId) respondError('usuario_id é obrigatório');
    if ($outroId === $userId) respondError('Você não pode iniciar conversa consigo mesmo');

    // Verificar se já existe
    $stmt = $db->prepare(
        "SELECT id FROM conversas
         WHERE (usuario1_id = ? AND usuario2_id = ?) OR (usuario1_id = ? AND usuario2_id = ?)"
    );
    $stmt->execute([$userId, $outroId, $outroId, $userId]);
    $conv = $stmt->fetch();

    if ($conv) {
        respond(['id' => (int) $conv['id'], 'criada' => false]);
    }

    // Criar nova conversa
    $stmt = $db->prepare("INSERT INTO conversas (usuario1_id, usuario2_id, produto_id) VALUES (?, ?, ?)");
    $stmt->execute([$userId, $outroId, $produtoId]);
    $convId = (int) $db->lastInsertId();

    respond(['id' => $convId, 'criada' => true], 201);
}

respondError('Método não permitido', 405);
