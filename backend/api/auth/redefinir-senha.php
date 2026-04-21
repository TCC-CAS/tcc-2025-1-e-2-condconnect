<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respondError('Método não permitido', 405);

$body  = getBody();
$token = trim($body['token'] ?? '');
$senha = $body['senha'] ?? '';

if (!$token || strlen($senha) < 6) {
    respondError('Dados inválidos', 400);
}

$db = getDB();

// Busca token válido e não expirado
$stmt = $db->prepare("SELECT email FROM password_resets WHERE token = ? AND usado = 0 AND expira_em > NOW()");
$stmt->execute([$token]);
$reset = $stmt->fetch();

if (!$reset) {
    respondError('Link inválido ou expirado', 400);
}

$hash = password_hash($senha, PASSWORD_DEFAULT);

// Atualiza senha do usuário
$db->prepare("UPDATE usuarios SET senha = ? WHERE email = ?")->execute([$hash, $reset['email']]);

// Invalida o token
$db->prepare("UPDATE password_resets SET usado = 1 WHERE token = ?")->execute([$token]);

respond(['ok' => true, 'message' => 'Senha redefinida com sucesso']);
