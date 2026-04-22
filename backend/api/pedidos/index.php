<?php
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../email-helper.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();

// GET - listar pedidos (compras e vendas)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tipo = $_GET['tipo'] ?? 'compras'; // compras | vendas

    if ($tipo === 'vendas') {
        $stmt = $db->prepare(
            "SELECT p.id, p.quantidade, p.preco_total, p.status, p.criado_em, p.atualizado_em,
                    pr.titulo as produto_titulo, pr.foto_principal as produto_foto,
                    u.nome as outro_nome, u.apartamento as outro_apto, u.bloco as outro_bloco
             FROM pedidos p
             JOIN produtos pr ON p.produto_id = pr.id
             JOIN usuarios u ON p.comprador_id = u.id
             WHERE p.vendedor_id = ?
             ORDER BY p.criado_em DESC"
        );
    } else {
        $stmt = $db->prepare(
            "SELECT p.id, p.quantidade, p.preco_total, p.status, p.criado_em, p.atualizado_em,
                    pr.titulo as produto_titulo, pr.foto_principal as produto_foto,
                    u.nome as outro_nome, u.apartamento as outro_apto, u.bloco as outro_bloco
             FROM pedidos p
             JOIN produtos pr ON p.produto_id = pr.id
             JOIN usuarios u ON p.vendedor_id = u.id
             WHERE p.comprador_id = ?
             ORDER BY p.criado_em DESC"
        );
    }
    $stmt->execute([$userId]);
    $pedidos = $stmt->fetchAll();

    $statusLabel = [
        'aguardando' => 'Aguardando',
        'confirmado' => 'Confirmado',
        'enviado'    => 'A Caminho',
        'entregue'   => 'Entregue',
        'cancelado'  => 'Cancelado',
    ];

    $result = array_map(function($p) use ($tipo, $statusLabel) {
        return [
            'id'           => (int) $p['id'],
            'id_fmt'       => 'CC-' . str_pad($p['id'], 5, '0', STR_PAD_LEFT),
            'quantidade'   => (int) $p['quantidade'],
            'preco_total'  => (float) $p['preco_total'],
            'preco_fmt'    => number_format((float)$p['preco_total'], 2, ',', '.'),
            'status'       => $p['status'],
            'status_label' => $statusLabel[$p['status']] ?? $p['status'],
            'criado_em'    => $p['criado_em'],
            'produto'      => [
                'titulo' => $p['produto_titulo'],
                'foto'   => $p['produto_foto'] ?? '/static/assets/images/produto-placeholder.jpg',
            ],
            $tipo === 'vendas' ? 'comprador' : 'vendedor' => $p['outro_nome'],
        ];
    }, $pedidos);

    respond(['pedidos' => $result, 'total' => count($result)]);
}

// POST - criar pedido (checkout do carrinho)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = getBody();
    $produtoIds = $body['produto_ids'] ?? [];

    if (empty($produtoIds)) {
        // Pegar do carrinho
        $cart = $db->prepare(
            "SELECT ic.produto_id, ic.quantidade, p.preco, p.usuario_id as vendedor_id, p.status
             FROM itens_carrinho ic JOIN produtos p ON ic.produto_id = p.id
             WHERE ic.usuario_id = ?"
        );
        $cart->execute([$userId]);
        $itens = $cart->fetchAll();
    } else {
        $placeholders = implode(',', array_fill(0, count($produtoIds), '?'));
        $cart = $db->prepare(
            "SELECT id as produto_id, 1 as quantidade, preco, usuario_id as vendedor_id, status
             FROM produtos WHERE id IN ($placeholders)"
        );
        $cart->execute($produtoIds);
        $itens = $cart->fetchAll();
    }

    if (empty($itens)) respondError('Nenhum item para finalizar');

    $pedidosCriados = [];
    foreach ($itens as $item) {
        if ($item['status'] !== 'disponivel') continue;
        if ((int) $item['vendedor_id'] === $userId) continue;

        $total = (float) $item['preco'] * (int) $item['quantidade'];

        $stmt = $db->prepare(
            "INSERT INTO pedidos (comprador_id, vendedor_id, produto_id, quantidade, preco_total)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$userId, $item['vendedor_id'], $item['produto_id'], $item['quantidade'], $total]);
        $pedidoId = (int) $db->lastInsertId();
        $pedidosCriados[] = $pedidoId;

        // Diminuir quantidade; marcar como vendido só se zerar
        $db->prepare("UPDATE produtos SET quantidade = GREATEST(0, quantidade - ?) WHERE id = ?")->execute([$item['quantidade'], $item['produto_id']]);
        $db->prepare("UPDATE produtos SET status = 'vendido' WHERE id = ? AND quantidade = 0")->execute([$item['produto_id']]);
        // Atualizar stats
        $db->prepare("UPDATE usuarios SET total_vendas = total_vendas + 1 WHERE id = ?")->execute([$item['vendedor_id']]);
        $db->prepare("UPDATE usuarios SET total_compras = total_compras + 1 WHERE id = ?")->execute([$userId]);

        // Notificar vendedor (notificação interna)
        notificar($item['vendedor_id'], 'pedido', 'Novo Pedido!', 'Você recebeu um novo pedido.', '/Templates/meus-pedidos.html');

        // E-mail para o vendedor
        $infos = $db->prepare("SELECT u.nome as vendedor_nome, u.email as vendedor_email, c.nome as comprador_nome, pr.titulo FROM usuarios u JOIN usuarios c ON c.id = ? JOIN produtos pr ON pr.id = ? WHERE u.id = ?");
        $infos->execute([$userId, $item['produto_id'], $item['vendedor_id']]);
        $inf = $infos->fetch();
        if ($inf) {
            $idFmt  = 'CC-' . str_pad($pedidoId, 5, '0', STR_PAD_LEFT);
            $preco  = 'R$ ' . number_format($total, 2, ',', '.');
            $corpo  = emailPedidoLayout('🛒 Você recebeu um novo pedido!',
                "<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Olá, <strong>{$inf['vendedor_nome']}</strong>! Você recebeu um novo pedido no CondConnect.</p>
                 <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
                   <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
                   <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>{$inf['titulo']}</p>
                   <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>$idFmt</strong> &nbsp;•&nbsp; Valor: <strong>$preco</strong></p>
                   <p style='margin:8px 0 0;color:#64748b;font-size:13px;'>Comprador: <strong>{$inf['comprador_nome']}</strong></p>
                 </div>
                 <a href='http://54.242.139.170/Templates/meus-pedidos.html' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-weight:700;margin-bottom:16px;'>Ver Pedido</a>
                 <p style='color:#64748b;font-size:14px;text-align:center;'>Confirme o pedido para avisar o comprador.</p>"
            );
            smtpSend($inf['vendedor_email'], "Novo pedido $idFmt - CondConnect", $corpo);
        }
    }

    // Limpar carrinho
    $db->prepare("DELETE FROM itens_carrinho WHERE usuario_id = ?")->execute([$userId]);

    respond(['message' => 'Pedido(s) criado(s) com sucesso', 'pedidos' => $pedidosCriados], 201);
}

respondError('Método não permitido', 405);
