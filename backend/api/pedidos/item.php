<?php
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../email-helper.php';
setCORSHeaders();

$userId = requireAuth();
$db     = getDB();
$id     = (int) ($_GET['id'] ?? 0);
if (!$id) respondError('ID do pedido inválido');

// GET - detalhes do pedido
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare(
        "SELECT p.*, pr.titulo, pr.foto_principal, pr.categoria,
                uc.nome as comprador_nome, uc.bloco as comprador_bloco, uc.apartamento as comprador_apto,
                uv.nome as vendedor_nome, uv.bloco as vendedor_bloco, uv.apartamento as vendedor_apto
         FROM pedidos p
         JOIN produtos pr ON p.produto_id = pr.id
         JOIN usuarios uc ON p.comprador_id = uc.id
         JOIN usuarios uv ON p.vendedor_id = uv.id
         WHERE p.id = ? AND (p.comprador_id = ? OR p.vendedor_id = ?)"
    );
    $stmt->execute([$id, $userId, $userId]);
    $pedido = $stmt->fetch();

    if (!$pedido) respondError('Pedido não encontrado', 404);

    respond([
        'id'         => (int) $pedido['id'],
        'id_fmt'     => 'CC-' . str_pad($pedido['id'], 5, '0', STR_PAD_LEFT),
        'status'     => $pedido['status'],
        'preco_total'=> (float) $pedido['preco_total'],
        'preco_fmt'  => number_format((float)$pedido['preco_total'], 2, ',', '.'),
        'quantidade' => (int) $pedido['quantidade'],
        'criado_em'  => $pedido['criado_em'],
        'produto'    => ['titulo' => $pedido['titulo'], 'foto' => $pedido['foto_principal'], 'categoria' => $pedido['categoria']],
        'comprador'  => ['nome' => $pedido['comprador_nome'], 'localizacao' => 'Bloco ' . $pedido['comprador_bloco'] . ' - Apto ' . $pedido['comprador_apto']],
        'vendedor'   => ['nome' => $pedido['vendedor_nome'], 'localizacao' => 'Bloco ' . $pedido['vendedor_bloco'] . ' - Apto ' . $pedido['vendedor_apto']],
    ]);
}

// PUT - atualizar status
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body   = getBody();
    $status = $body['status'] ?? '';

    $validos = ['confirmado', 'enviado', 'entregue', 'cancelado'];
    if (!in_array($status, $validos)) respondError('Status inválido');

    $stmt = $db->prepare(
        "SELECT p.comprador_id, p.vendedor_id, p.status as status_atual, p.preco_total,
                pr.titulo as produto_titulo,
                uc.nome as comprador_nome, uc.email as comprador_email,
                uv.nome as vendedor_nome, uv.email as vendedor_email
         FROM pedidos p
         JOIN produtos pr ON p.produto_id = pr.id
         JOIN usuarios uc ON p.comprador_id = uc.id
         JOIN usuarios uv ON p.vendedor_id = uv.id
         WHERE p.id = ?"
    );
    $stmt->execute([$id]);
    $pedido = $stmt->fetch();
    if (!$pedido) respondError('Pedido não encontrado', 404);

    if ((int) $pedido['comprador_id'] !== $userId && (int) $pedido['vendedor_id'] !== $userId) {
        respondError('Sem permissão', 403);
    }

    $db->prepare("UPDATE pedidos SET status = ? WHERE id = ?")->execute([$status, $id]);

    $idFmt   = 'CC-' . str_pad($id, 5, '0', STR_PAD_LEFT);
    $preco   = 'R$ ' . number_format((float)$pedido['preco_total'], 2, ',', '.');
    $produto = $pedido['produto_titulo'];

    $outroId = (int) $pedido['comprador_id'] === $userId ? (int) $pedido['vendedor_id'] : (int) $pedido['comprador_id'];
    $labels  = ['confirmado' => 'Pedido Confirmado', 'enviado' => 'Pedido Enviado', 'entregue' => 'Pedido Entregue', 'cancelado' => 'Pedido Cancelado'];
    notificar($outroId, 'pedido', $labels[$status] ?? 'Atualização de Pedido', 'Status do pedido atualizado.', '/Templates/meus-pedidos.html');

    // E-mails por status
    if ($status === 'confirmado') {
        $corpo = emailPedidoLayout('✅ Seu pedido foi confirmado!',
            "<p style='color:#64748b;text-align:center;margin-bottom:24px;'>Boa notícia, <strong>{$pedido['comprador_nome']}</strong>! O vendedor confirmou seu pedido.</p>
             <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
               <p style='margin:0;color:#64748b;font-size:13px;'>Pedido</p>
               <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>$produto</p>
               <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>$idFmt</strong> &nbsp;•&nbsp; Valor: <strong>$preco</strong></p>
             </div>
             <p style='color:#64748b;font-size:14px;text-align:center;'>Aguarde — em breve o vendedor enviará o produto.</p>"
        );
        smtpSend($pedido['comprador_email'], "Pedido $idFmt confirmado - CondConnect", $corpo);
    }

    if ($status === 'enviado') {
        $corpo = emailPedidoLayout('🚚 Seu pedido saiu para entrega!',
            "<p style='color:#64748b;text-align:center;margin-bottom:24px;'><strong>{$pedido['comprador_nome']}</strong>, seu pedido está a caminho!</p>
             <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
               <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
               <p style='margin:4px 0 12px;color:#1e293b;font-weight:700;font-size:16px;'>$produto</p>
               <p style='margin:0;color:#64748b;font-size:13px;'>ID: <strong>$idFmt</strong> &nbsp;•&nbsp; Valor: <strong>$preco</strong></p>
             </div>
             <p style='color:#64748b;font-size:14px;text-align:center;'>Combine com o vendedor o local e horário de entrega.</p>"
        );
        smtpSend($pedido['comprador_email'], "Pedido $idFmt saiu para entrega - CondConnect", $corpo);
    }

    if ($status === 'entregue') {
        $corpo = emailPedidoLayout('🎉 Entrega confirmada!',
            "<p style='color:#64748b;text-align:center;margin-bottom:24px;'>O comprador <strong>{$pedido['comprador_nome']}</strong> confirmou o recebimento do pedido <strong>$idFmt</strong>.</p>
             <div style='background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;'>
               <p style='margin:0;color:#64748b;font-size:13px;'>Produto vendido</p>
               <p style='margin:4px 0 8px;color:#1e293b;font-weight:700;font-size:16px;'>$produto</p>
               <p style='margin:0;color:#00a6a6;font-weight:700;font-size:18px;'>$preco</p>
             </div>
             <p style='color:#64748b;font-size:14px;text-align:center;'>Obrigado por vender no CondConnect!</p>"
        );
        smtpSend($pedido['vendedor_email'], "Venda concluída: $idFmt - CondConnect", $corpo);
    }

    if ($status === 'cancelado') {
        $emailDestino = (int) $pedido['vendedor_id'] === $userId ? $pedido['comprador_email'] : $pedido['vendedor_email'];
        $corpo = emailPedidoLayout('❌ Pedido cancelado',
            "<p style='color:#64748b;text-align:center;margin-bottom:24px;'>O pedido <strong>$idFmt</strong> foi cancelado.</p>
             <div style='background:#f1f5f9;border-radius:12px;padding:20px;'>
               <p style='margin:0;color:#64748b;font-size:13px;'>Produto</p>
               <p style='margin:4px 0;color:#1e293b;font-weight:700;font-size:16px;'>$produto</p>
             </div>"
        );
        smtpSend($emailDestino, "Pedido $idFmt cancelado - CondConnect", $corpo);
    }

    respond(['message' => 'Status atualizado']);
}

respondError('Método não permitido', 405);
