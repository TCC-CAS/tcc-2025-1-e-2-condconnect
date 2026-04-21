<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Método não permitido', 405);
}

$body = getBody();
$nome       = trim($body['nome'] ?? '');
$email      = trim($body['email'] ?? '');
$senha      = $body['senha'] ?? '';
$apartamento = trim($body['apartamento'] ?? '');
$bloco      = trim($body['bloco'] ?? '');
$telefone   = trim($body['telefone'] ?? '');

if (!$nome || !$email || !$senha || !$apartamento || !$bloco) {
    respondError('Campos obrigatórios: nome, email, senha, apartamento, bloco');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('Email inválido');
}

if (strlen($senha) < 6) {
    respondError('A senha deve ter pelo menos 6 caracteres');
}

if (strlen($nome) < 3) {
    respondError('O nome deve ter pelo menos 3 caracteres');
}

$db = getDB();

$check = $db->prepare("SELECT id FROM usuarios WHERE email = ?");
$check->execute([$email]);
if ($check->fetch()) {
    respondError('Este email já está cadastrado', 409);
}

$hash = password_hash($senha, PASSWORD_DEFAULT);

$stmt = $db->prepare(
    "INSERT INTO usuarios (nome, email, senha, apartamento, bloco, telefone) VALUES (?, ?, ?, ?, ?, ?)"
);
$stmt->execute([$nome, $email, $hash, $apartamento, $bloco, $telefone]);
$userId = (int) $db->lastInsertId();

// Criar configurações padrão
$db->prepare("INSERT INTO configuracoes_usuario (usuario_id) VALUES (?)")->execute([$userId]);

$_SESSION['user_id']    = $userId;
$_SESSION['user_role']  = 'usuario';
$_SESSION['user_email'] = $email;
$_SESSION['user_nome']  = $nome;

respond([
    'id'          => $userId,
    'nome'        => $nome,
    'email'       => $email,
    'papel'       => 'usuario',
    'apartamento' => $apartamento,
    'bloco'       => $bloco,
], 201);
