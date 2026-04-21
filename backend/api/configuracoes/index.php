<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare("SELECT * FROM configuracoes_usuario WHERE usuario_id = ?");
    $stmt->execute([$userId]);
    $cfg = $stmt->fetch();

    if (!$cfg) {
        $db->prepare("INSERT INTO configuracoes_usuario (usuario_id) VALUES (?)")->execute([$userId]);
        $cfg = ['usuario_id' => $userId, 'notif_email' => 1, 'notif_sms' => 0, 'notif_marketing' => 0, 'tema' => 'light', 'idioma' => 'pt-BR'];
    }

    respond([
        'notif_email'      => (bool) $cfg['notif_email'],
        'notif_sms'        => (bool) $cfg['notif_sms'],
        'notif_marketing'  => (bool) $cfg['notif_marketing'],
        'tema'             => $cfg['tema'],
        'idioma'           => $cfg['idioma'],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body   = getBody();
    $campos = [];
    $vals   = [];

    $permitidos = ['notif_email', 'notif_sms', 'notif_marketing', 'tema', 'idioma'];
    foreach ($permitidos as $c) {
        if (isset($body[$c])) {
            $campos[] = "$c = ?";
            $vals[]   = $body[$c];
        }
    }

    if (empty($campos)) respondError('Nenhuma configuração para salvar');

    $vals[] = $userId;
    $db->prepare("UPDATE configuracoes_usuario SET " . implode(', ', $campos) . " WHERE usuario_id = ?")->execute($vals);

    respond(['message' => 'Configurações salvas com sucesso']);
}

respondError('Método não permitido', 405);
