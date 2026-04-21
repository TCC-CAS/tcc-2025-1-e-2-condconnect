<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$db = getDB();
$id = (int) ($_GET['id'] ?? 0);
if (!$id) respondError('ID do produto inválido');

// GET - detalhes do produto
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT p.*, u.nome as vendedor_nome, u.apartamento as vendedor_apto,
                u.bloco as vendedor_bloco, u.foto_url as vendedor_foto,
                u.rating as vendedor_rating, u.total_vendas as vendedor_vendas,
                u.criado_em as vendedor_desde
         FROM produtos p
         JOIN usuarios u ON p.usuario_id = u.id
         WHERE p.id = ?"
    );
    $stmt->execute([$id]);
    $p = $stmt->fetch();

    if (!$p) respondError('Produto não encontrado', 404);

    $userId   = currentUserId();
    $favorito = false;
    if ($userId) {
        $fav = $db->prepare("SELECT id FROM favoritos WHERE usuario_id = ? AND produto_id = ?");
        $fav->execute([$userId, $id]);
        $favorito = (bool) $fav->fetch();
    }

    // Avaliações do produto
    $avStmt = $db->prepare(
        "SELECT a.nota, a.comentario, a.criado_em, u.nome as avaliador
         FROM avaliacoes a JOIN usuarios u ON a.avaliador_id = u.id
         WHERE a.produto_id = ? ORDER BY a.criado_em DESC LIMIT 10"
    );
    $avStmt->execute([$id]);
    $avaliacoes = $avStmt->fetchAll();

    // Imagens extras
    $imgStmt = $db->prepare("SELECT url FROM imagens_produto WHERE produto_id = ? ORDER BY ordem");
    $imgStmt->execute([$id]);
    $imagens = array_column($imgStmt->fetchAll(), 'url');

    respond([
        'id'          => (int) $p['id'],
        'titulo'      => $p['titulo'],
        'descricao'   => $p['descricao'],
        'preco'       => (float) $p['preco'],
        'preco_fmt'   => 'R$ ' . number_format((float)$p['preco'], 2, ',', '.'),
        'categoria'   => $p['categoria'],
        'condicao'    => $p['condicao'],
        'status'      => $p['status'],
        'foto'        => $p['foto_principal'] ?? '/static/assets/images/produto-placeholder.jpg',
        'imagens'     => $imagens,
        'criado_em'   => $p['criado_em'],
        'favorito'    => $favorito,
        'avaliacoes'  => $avaliacoes,
        'vendedor'    => [
            'id'          => (int) $p['usuario_id'],
            'nome'        => $p['vendedor_nome'],
            'foto'        => $p['vendedor_foto'],
            'apto'        => $p['vendedor_apto'],
            'bloco'       => $p['vendedor_bloco'],
            'localizacao' => 'Bloco ' . $p['vendedor_bloco'] . ' - Apto ' . $p['vendedor_apto'],
            'rating'      => (float) $p['vendedor_rating'],
            'vendas'      => (int) $p['vendedor_vendas'],
            'membro_desde'=> $p['vendedor_desde'],
        ],
    ]);
}

// PUT - editar produto
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $userId = requireAuth();
    $body   = getBody();

    // Verificar propriedade
    $own = $db->prepare("SELECT usuario_id FROM produtos WHERE id = ?");
    $own->execute([$id]);
    $row = $own->fetch();
    if (!$row) respondError('Produto não encontrado', 404);
    if ((int) $row['usuario_id'] !== $userId && currentUserRole() !== 'admin') {
        respondError('Sem permissão para editar este produto', 403);
    }

    $campos = [];
    $valores = [];

    $mapeamento = ['titulo', 'descricao', 'categoria', 'condicao', 'foto_principal'];
    foreach ($mapeamento as $campo) {
        if (isset($body[$campo])) {
            $campos[]  = "$campo = ?";
            $valores[] = trim($body[$campo]);
        }
    }

    if (isset($body['preco'])) {
        $campos[]  = "preco = ?";
        $valores[] = (float) str_replace(',', '.', $body['preco']);
    }

    if (isset($body['status']) && currentUserRole() === 'admin') {
        $campos[]  = "status = ?";
        $valores[] = $body['status'];
        if (isset($body['motivo_rejeicao'])) {
            $campos[]  = "motivo_rejeicao = ?";
            $valores[] = $body['motivo_rejeicao'];
        }
    }

    if (empty($campos)) respondError('Nenhum campo para atualizar');

    $valores[] = $id;
    $db->prepare("UPDATE produtos SET " . implode(', ', $campos) . " WHERE id = ?")->execute($valores);

    respond(['message' => 'Produto atualizado com sucesso']);
}

// DELETE - excluir produto
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $userId = requireAuth();

    $own = $db->prepare("SELECT usuario_id FROM produtos WHERE id = ?");
    $own->execute([$id]);
    $row = $own->fetch();
    if (!$row) respondError('Produto não encontrado', 404);
    if ((int) $row['usuario_id'] !== $userId && currentUserRole() !== 'admin') {
        respondError('Sem permissão para excluir este produto', 403);
    }

    $db->prepare("DELETE FROM produtos WHERE id = ?")->execute([$id]);
    respond(['message' => 'Produto excluído com sucesso']);
}

respondError('Método não permitido', 405);
