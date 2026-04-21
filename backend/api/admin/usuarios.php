<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();
requireAdmin();

$db = getDB();

// GET - listar usuários
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $busca = trim($_GET['busca'] ?? '');
    $where  = '';
    $params = [];
    if ($busca) {
        $where  = 'WHERE nome LIKE ? OR email LIKE ?';
        $like   = "%$busca%";
        $params = [$like, $like];
    }

    $stmt = $db->prepare(
        "SELECT id, nome, email, papel, apartamento, bloco, rating, total_vendas, total_compras, ativo, criado_em
         FROM usuarios $where ORDER BY criado_em DESC"
    );
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    respond(array_map(function($u) {
        return [
            'id'           => (int) $u['id'],
            'nome'         => $u['nome'],
            'email'        => $u['email'],
            'papel'        => $u['papel'],
            'apartamento'  => $u['apartamento'],
            'bloco'        => $u['bloco'],
            'rating'       => (float) $u['rating'],
            'total_vendas' => (int) $u['total_vendas'],
            'total_compras'=> (int) $u['total_compras'],
            'ativo'        => (bool) $u['ativo'],
            'criado_em'    => $u['criado_em'],
        ];
    }, $users));
}

// PUT - banir/desbanir usuário ou mudar papel
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body      = getBody();
    $usuarioId = (int) ($body['usuario_id'] ?? 0);
    $acao      = $body['acao'] ?? ''; // banir | desbanir | tornar_admin | tornar_usuario

    if (!$usuarioId || !in_array($acao, ['banir', 'desbanir', 'tornar_admin', 'tornar_usuario'])) {
        respondError('usuario_id e acao são obrigatórios');
    }

    switch ($acao) {
        case 'banir':
            $db->prepare("UPDATE usuarios SET ativo = 0 WHERE id = ?")->execute([$usuarioId]);
            break;
        case 'desbanir':
            $db->prepare("UPDATE usuarios SET ativo = 1 WHERE id = ?")->execute([$usuarioId]);
            break;
        case 'tornar_admin':
            $db->prepare("UPDATE usuarios SET papel = 'admin' WHERE id = ?")->execute([$usuarioId]);
            break;
        case 'tornar_usuario':
            $db->prepare("UPDATE usuarios SET papel = 'usuario' WHERE id = ?")->execute([$usuarioId]);
            break;
    }

    respond(['message' => "Ação '$acao' realizada com sucesso"]);
}

respondError('Método não permitido', 405);
