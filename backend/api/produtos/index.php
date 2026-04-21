<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

$db = getDB();

// GET - listar/buscar produtos
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $categoria  = $_GET['categoria'] ?? 'all';
    $busca      = trim($_GET['busca'] ?? '');
    $precoMin   = isset($_GET['preco_min']) ? (float) $_GET['preco_min'] : null;
    $precoMax   = isset($_GET['preco_max']) ? (float) $_GET['preco_max'] : null;
    $meus       = isset($_GET['meus']) && $_GET['meus'] === '1';
    $limite     = min((int) ($_GET['limite'] ?? 50), 100);
    $offset     = (int) ($_GET['offset'] ?? 0);

    $where  = ['p.status = ?'];
    $params = ['disponivel'];

    if ($meus) {
        $userId = requireAuth();
        $where  = ['p.usuario_id = ?'];
        $params = [$userId];
        // Mostrar todos os status para o próprio usuário
        unset($where[0]);
        $where  = ['p.usuario_id = ?'];
        $params = [$userId];
    }

    if ($categoria !== 'all' && $categoria !== '') {
        $where[]  = 'p.categoria = ?';
        $params[] = $categoria;
    }

    if ($busca !== '') {
        $where[]  = '(p.titulo LIKE ? OR p.descricao LIKE ?)';
        $like     = "%$busca%";
        $params[] = $like;
        $params[] = $like;
    }

    if ($precoMin !== null) {
        $where[]  = 'p.preco >= ?';
        $params[] = $precoMin;
    }

    if ($precoMax !== null) {
        $where[]  = 'p.preco <= ?';
        $params[] = $precoMax;
    }

    $whereStr = implode(' AND ', $where);

    $sql = "SELECT p.id, p.titulo, p.descricao, p.preco, p.categoria, p.condicao,
                   p.status, p.foto_principal, p.criado_em,
                   u.id as vendedor_id, u.nome as vendedor_nome,
                   u.apartamento as vendedor_apto, u.bloco as vendedor_bloco,
                   u.rating as vendedor_rating, u.total_vendas as vendedor_vendas
            FROM produtos p
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE $whereStr
            ORDER BY p.criado_em DESC
            LIMIT ? OFFSET ?";

    $params[] = $limite;
    $params[] = $offset;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $produtos = $stmt->fetchAll();

    $userId = currentUserId();
    $favoritos = [];
    if ($userId) {
        $favStmt = $db->prepare("SELECT produto_id FROM favoritos WHERE usuario_id = ?");
        $favStmt->execute([$userId]);
        $favoritos = array_column($favStmt->fetchAll(), 'produto_id');
    }

    $result = array_map(function($p) use ($favoritos) {
        return [
            'id'          => (int) $p['id'],
            'titulo'      => $p['titulo'],
            'descricao'   => $p['descricao'],
            'preco'       => (float) $p['preco'],
            'preco_fmt'   => 'R$ ' . number_format((float)$p['preco'], 2, ',', '.'),
            'categoria'   => $p['categoria'],
            'condicao'    => $p['condicao'],
            'status'      => $p['status'],
            'foto'        => $p['foto_principal'] ?? '/static/assets/images/produto-placeholder.jpg',
            'criado_em'   => $p['criado_em'],
            'favorito'    => in_array((int)$p['id'], $favoritos),
            'vendedor'    => [
                'id'       => (int) $p['vendedor_id'],
                'nome'     => $p['vendedor_nome'],
                'apto'     => $p['vendedor_apto'],
                'bloco'    => $p['vendedor_bloco'],
                'localizacao' => 'Bloco ' . $p['vendedor_bloco'] . ' - Apto ' . $p['vendedor_apto'],
                'rating'   => (float) $p['vendedor_rating'],
                'vendas'   => (int) $p['vendedor_vendas'],
            ],
        ];
    }, $produtos);

    respond($result);
}

// POST - criar produto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = requireAuth();
    $body   = getBody();

    $titulo    = trim($body['titulo'] ?? '');
    $descricao = trim($body['descricao'] ?? '');
    $preco     = isset($body['preco']) ? (float) str_replace(',', '.', $body['preco']) : null;
    $categoria = trim($body['categoria'] ?? '');
    $condicao  = $body['condicao'] ?? 'Seminovo';
    $foto      = trim($body['foto'] ?? '');

    if (!$titulo || $preco === null || !$categoria) {
        respondError('Campos obrigatórios: titulo, preco, categoria');
    }

    $condicoesValidas = ['Novo', 'Seminovo', 'Usado'];
    if (!in_array($condicao, $condicoesValidas)) $condicao = 'Seminovo';

    $stmt = $db->prepare(
        "INSERT INTO produtos (usuario_id, titulo, descricao, preco, categoria, condicao, foto_principal)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$userId, $titulo, $descricao, $preco, $categoria, $condicao, $foto ?: null]);
    $produtoId = (int) $db->lastInsertId();

    respond([
        'id'        => $produtoId,
        'titulo'    => $titulo,
        'preco'     => $preco,
        'preco_fmt' => 'R$ ' . number_format($preco, 2, ',', '.'),
        'categoria' => $categoria,
        'condicao'  => $condicao,
        'status'    => 'disponivel',
        'foto'      => $foto ?: '/static/assets/images/produto-placeholder.jpg',
    ], 201);
}

respondError('Método não permitido', 405);
