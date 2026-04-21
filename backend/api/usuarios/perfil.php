<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$db = getDB();
$id = (int) ($_GET['id'] ?? 0);
if (!$id) respondError('ID do usuário inválido');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT id, nome, foto_url, bio, rating, total_vendas, total_compras, apartamento, bloco, criado_em
         FROM usuarios WHERE id = ? AND ativo = 1"
    );
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) respondError('Usuário não encontrado', 404);

    // Produtos ativos
    $prods = $db->prepare("SELECT COUNT(*) FROM produtos WHERE usuario_id = ? AND status = 'disponivel'");
    $prods->execute([$id]);

    // Avaliações
    $avs = $db->prepare(
        "SELECT a.nota, a.comentario, a.criado_em, u.nome as avaliador
         FROM avaliacoes a JOIN usuarios u ON a.avaliador_id = u.id
         WHERE a.avaliado_id = ? ORDER BY a.criado_em DESC LIMIT 5"
    );
    $avs->execute([$id]);

    respond(array_merge($user, [
        'id'              => (int) $user['id'],
        'rating'          => (float) $user['rating'],
        'total_vendas'    => (int) $user['total_vendas'],
        'total_compras'   => (int) $user['total_compras'],
        'total_produtos'  => (int) $prods->fetchColumn(),
        'avaliacoes'      => $avs->fetchAll(),
    ]));
}

respondError('Método não permitido', 405);
