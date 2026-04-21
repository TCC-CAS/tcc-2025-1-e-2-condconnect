<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();
requireAdmin();

$db = getDB();

// GET - todos os produtos para moderação
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? 'all';

    $where  = '';
    $params = [];
    if ($status !== 'all') {
        $where  = 'WHERE p.status = ?';
        $params = [$status];
    }

    $stmt = $db->prepare(
        "SELECT p.id, p.titulo, p.preco, p.categoria, p.condicao, p.status,
                p.foto_principal, p.criado_em, p.motivo_rejeicao,
                u.id as vendedor_id, u.nome as vendedor_nome,
                u.apartamento as vendedor_apto, u.bloco as vendedor_bloco
         FROM produtos p JOIN usuarios u ON p.usuario_id = u.id
         $where ORDER BY p.criado_em DESC"
    );
    $stmt->execute($params);
    $produtos = $stmt->fetchAll();

    respond(array_map(function($p) {
        return [
            'id'        => (int) $p['id'],
            'titulo'    => $p['titulo'],
            'preco'     => (float) $p['preco'],
            'preco_fmt' => 'R$ ' . number_format((float)$p['preco'], 2, ',', '.'),
            'categoria' => $p['categoria'],
            'condicao'  => $p['condicao'],
            'status'    => $p['status'],
            'foto'      => $p['foto_principal'],
            'criado_em' => $p['criado_em'],
            'vendedor'  => [
                'id'    => (int) $p['vendedor_id'],
                'nome'  => $p['vendedor_nome'],
                'local' => 'Bloco ' . $p['vendedor_bloco'] . ' - Apto ' . $p['vendedor_apto'],
            ],
        ];
    }, $produtos));
}

// PUT - aprovar ou rejeitar produto
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body      = getBody();
    $produtoId = (int) ($body['produto_id'] ?? 0);
    $acao      = $body['acao'] ?? ''; // aprovar | rejeitar | remover
    $motivo    = trim($body['motivo'] ?? '');

    if (!$produtoId || !in_array($acao, ['aprovar', 'rejeitar', 'remover'])) {
        respondError('produto_id e acao (aprovar|rejeitar|remover) são obrigatórios');
    }

    $prod = $db->prepare("SELECT usuario_id, titulo FROM produtos WHERE id = ?");
    $prod->execute([$produtoId]);
    $produto = $prod->fetch();
    if (!$produto) respondError('Produto não encontrado', 404);

    if ($acao === 'aprovar') {
        $db->prepare("UPDATE produtos SET status = 'disponivel', motivo_rejeicao = NULL WHERE id = ?")->execute([$produtoId]);
        notificar($produto['usuario_id'], 'produto', 'Anúncio Aprovado!', "Seu anúncio \"{$produto['titulo']}\" foi aprovado.", '/Templates/meus-produtos.html');
    } elseif ($acao === 'rejeitar') {
        $db->prepare("UPDATE produtos SET status = 'rejeitado', motivo_rejeicao = ? WHERE id = ?")->execute([$motivo, $produtoId]);
        notificar($produto['usuario_id'], 'produto', 'Anúncio Rejeitado', "Seu anúncio \"{$produto['titulo']}\" foi rejeitado. Motivo: $motivo", '/Templates/meus-produtos.html');
    } elseif ($acao === 'remover') {
        $db->prepare("DELETE FROM produtos WHERE id = ?")->execute([$produtoId]);
        notificar($produto['usuario_id'], 'produto', 'Anúncio Removido', "Seu anúncio \"{$produto['titulo']}\" foi removido pela moderação.", '/Templates/meus-produtos.html');
    }

    respond(['message' => "Ação '$acao' realizada com sucesso"]);
}

respondError('Método não permitido', 405);
