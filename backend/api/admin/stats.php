<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();
requireAdmin();

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $totalUsuarios    = $db->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    $totalProdutos    = $db->query("SELECT COUNT(*) FROM produtos")->fetchColumn();
    $produtosAtivos   = $db->query("SELECT COUNT(*) FROM produtos WHERE status = 'disponivel'")->fetchColumn();
    $produtosPendentes= $db->query("SELECT COUNT(*) FROM produtos WHERE status = 'pendente'")->fetchColumn();
    $totalPedidos     = $db->query("SELECT COUNT(*) FROM pedidos")->fetchColumn();
    $totalMensagens   = $db->query("SELECT COUNT(*) FROM mensagens")->fetchColumn();
    $relatoriosPendentes = $db->query("SELECT COUNT(*) FROM relatorios WHERE status = 'pendente'")->fetchColumn();

    // Relatorios pendentes com detalhes
    $relStmt = $db->prepare(
        "SELECT r.id, r.tipo, r.alvo_id, r.motivo, r.descricao, r.criado_em, u.nome as reporter
         FROM relatorios r JOIN usuarios u ON r.reporter_id = u.id
         WHERE r.status = 'pendente' ORDER BY r.criado_em DESC LIMIT 10"
    );
    $relStmt->execute();
    $relatorios = $relStmt->fetchAll();

    // Usuários banidos
    $banidos = $db->query("SELECT COUNT(*) FROM usuarios WHERE ativo = 0")->fetchColumn();

    respond([
        'total_usuarios'       => (int) $totalUsuarios,
        'total_produtos'       => (int) $totalProdutos,
        'produtos_ativos'      => (int) $produtosAtivos,
        'produtos_pendentes'   => (int) $produtosPendentes,
        'total_pedidos'        => (int) $totalPedidos,
        'total_mensagens'      => (int) $totalMensagens,
        'relatorios_pendentes' => (int) $relatoriosPendentes,
        'usuarios_banidos'     => (int) $banidos,
        'relatorios'           => $relatorios,
    ]);
}

respondError('Método não permitido', 405);
