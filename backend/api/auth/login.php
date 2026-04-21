<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Método não permitido', 405);
}

$body  = getBody();
$email = trim($body['email'] ?? '');
$senha = $body['senha'] ?? '';

if (!$email || !$senha) {
    respondError('Email e senha são obrigatórios');
}

$db   = getDB();
$stmt = $db->prepare("SELECT * FROM usuarios WHERE email = ? AND ativo = 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($senha, $user['senha'])) {
    respondError('Email ou senha incorretos', 401);
}

$_SESSION['user_id']    = (int) $user['id'];
$_SESSION['user_role']  = $user['papel'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_nome']  = $user['nome'];

respond([
    'id'          => (int) $user['id'],
    'nome'        => $user['nome'],
    'email'       => $user['email'],
    'papel'       => $user['papel'],
    'apartamento' => $user['apartamento'],
    'bloco'       => $user['bloco'],
    'foto_url'    => $user['foto_url'],
    'rating'      => (float) $user['rating'],
    'total_vendas'=> (int) $user['total_vendas'],
]);
