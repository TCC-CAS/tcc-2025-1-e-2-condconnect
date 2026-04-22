<?php
require_once __DIR__ . '/../helpers.php';
setCORSHeaders();

$userId = requireAuth();
$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT id, nome, email, telefone, apartamento, bloco, foto_url, bio,
                rating, total_vendas, total_compras, papel, criado_em
         FROM usuarios WHERE id = ?"
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) respondError('Usuário não encontrado', 404);

    // Stats
    $totalProdutos = $db->prepare("SELECT COUNT(*) FROM produtos WHERE usuario_id = ? AND status != 'rejeitado'");
    $totalProdutos->execute([$userId]);

    $totalFavoritos = $db->prepare("SELECT COUNT(*) FROM favoritos WHERE usuario_id = ?");
    $totalFavoritos->execute([$userId]);

    $totalPedidos = $db->prepare("SELECT COUNT(*) FROM pedidos WHERE comprador_id = ?");
    $totalPedidos->execute([$userId]);

    $totalVendas = $db->prepare("SELECT COUNT(*) FROM pedidos WHERE vendedor_id = ? AND status = 'entregue'");
    $totalVendas->execute([$userId]);

    $faturamento = $db->prepare("SELECT COALESCE(SUM(preco_total), 0) FROM pedidos WHERE vendedor_id = ? AND status = 'entregue'");
    $faturamento->execute([$userId]);

    // Notificações não lidas
    $notifNaoLidas = $db->prepare("SELECT COUNT(*) FROM notificacoes WHERE usuario_id = ? AND lida = 0");
    $notifNaoLidas->execute([$userId]);

    // Mensagens não lidas
    $msgNaoLidas = $db->prepare(
        "SELECT COUNT(*) FROM mensagens m
         JOIN conversas c ON m.conversa_id = c.id
         WHERE (c.usuario1_id = ? OR c.usuario2_id = ?) AND m.remetente_id != ? AND m.lida = 0"
    );
    $msgNaoLidas->execute([$userId, $userId, $userId]);

    respond(array_merge($user, [
        'id'              => (int) $user['id'],
        'rating'          => (float) $user['rating'],
        'total_vendas'    => (int) $totalVendas->fetchColumn(),
        'faturamento'     => (float) $faturamento->fetchColumn(),
        'total_compras'   => (int) $user['total_compras'],
        'total_produtos'  => (int) $totalProdutos->fetchColumn(),
        'total_favoritos' => (int) $totalFavoritos->fetchColumn(),
        'total_pedidos'   => (int) $totalPedidos->fetchColumn(),
        'notif_nao_lidas' => (int) $notifNaoLidas->fetchColumn(),
        'msg_nao_lidas'   => (int) $msgNaoLidas->fetchColumn(),
    ]));
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = getBody();
    $campos = [];
    $valores = [];

    $permitidos = ['nome', 'telefone', 'apartamento', 'bloco', 'bio'];
    foreach ($permitidos as $campo) {
        if (isset($body[$campo])) {
            $campos[]  = "$campo = ?";
            $valores[] = trim($body[$campo]);
        }
    }

    if (isset($body['nova_senha'])) {
        if (strlen($body['nova_senha']) < 6) {
            respondError('A nova senha deve ter pelo menos 6 caracteres');
        }
        // Verificar senha atual
        $senhaAtual = $db->prepare("SELECT senha FROM usuarios WHERE id = ?");
        $senhaAtual->execute([$userId]);
        $hash = $senhaAtual->fetchColumn();
        if (!password_verify($body['senha_atual'] ?? '', $hash)) {
            respondError('Senha atual incorreta', 401);
        }
        $campos[]  = "senha = ?";
        $valores[] = password_hash($body['nova_senha'], PASSWORD_DEFAULT);
    }

    if (empty($campos)) respondError('Nenhum campo para atualizar');

    $valores[] = $userId;
    $db->prepare("UPDATE usuarios SET " . implode(', ', $campos) . " WHERE id = ?")->execute($valores);

    respond(['message' => 'Perfil atualizado com sucesso']);
}

respondError('Método não permitido', 405);
