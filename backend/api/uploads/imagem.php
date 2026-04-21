<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

define('SIGHTENGINE_USER',   getenv('SIGHTENGINE_USER')   ?: '');
define('SIGHTENGINE_SECRET', getenv('SIGHTENGINE_SECRET') ?: '');

$userId = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Método não permitido', 405);
}

if (empty($_FILES['imagem'])) {
    respondError('Nenhuma imagem enviada');
}

$file    = $_FILES['imagem'];
$maxSize = 5 * 1024 * 1024; // 5MB

if ($file['error'] !== UPLOAD_ERR_OK) {
    respondError('Erro no upload da imagem');
}

if ($file['size'] > $maxSize) {
    respondError('Imagem muito grande. Máximo: 5MB');
}

$tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $tiposPermitidos)) {
    respondError('Tipo de arquivo não permitido. Use JPG, PNG ou WebP');
}

$ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
$nomeArq  = $userId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
$uploadDir = __DIR__ . '/../../../backend/uploads/produtos/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$destino = $uploadDir . $nomeArq;

if (!move_uploaded_file($file['tmp_name'], $destino)) {
    respondError('Falha ao salvar imagem', 500);
}

// Moderação de conteúdo via Python + Sightengine
if (SIGHTENGINE_USER && SIGHTENGINE_SECRET) {
    $script  = escapeshellarg(__DIR__ . '/../../../backend/moderation.py');
    $imgPath = escapeshellarg($destino);
    $apiUser = escapeshellarg(SIGHTENGINE_USER);
    $apiSec  = escapeshellarg(SIGHTENGINE_SECRET);
    $output  = shell_exec("python3 $script $imgPath $apiUser $apiSec 2>/dev/null");
    $result  = $output ? json_decode($output, true) : null;
    if ($result && !$result['safe']) {
        unlink($destino);
        respondError('Imagem rejeitada: ' . $result['reason'], 422);
    }
}

$url = '/backend/uploads/produtos/' . $nomeArq;
respond(['url' => $url, 'message' => 'Imagem enviada com sucesso']);
