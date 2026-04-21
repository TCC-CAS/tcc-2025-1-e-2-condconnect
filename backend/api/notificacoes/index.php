<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

// GET - listar notificações
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT id, tipo, titulo, mensagem, lida, link, criado_em
         FROM notificacoes WHERE usuario_id = ?
         ORDER BY criado_em DESC LIMIT 30"
    );
    $stmt->execute([$userId]);
    $notifs = $stmt->fetchAll();

    $naoLidas = $db->prepare("SELECT COUNT(*) FROM notificacoes WHERE usuario_id = ? AND lida = 0");
    $naoLidas->execute([$userId]);

    $result = array_map(function($n) {
        return [
            'id'        => (int) $n['id'],
            'tipo'      => $n['tipo'],
            'titulo'    => $n['titulo'],
            'mensagem'  => $n['mensagem'],
            'lida'      => (bool) $n['lida'],
            'link'      => $n['link'],
            'criado_em' => $n['criado_em'],
        ];
    }, $notifs);

    respond(['notificacoes' => $result, 'nao_lidas' => (int) $naoLidas->fetchColumn()]);
}

// PUT - marcar como lida
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body  = getBody();
    $notifId = isset($body['id']) ? (int) $body['id'] : null;

    if ($notifId) {
        $db->prepare("UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?")->execute([$notifId, $userId]);
    } else {
        // Marcar todas
        $db->prepare("UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?")->execute([$userId]);
    }

    respond(['message' => 'Notificações marcadas como lidas']);
}

respondError('Método não permitido', 405);
