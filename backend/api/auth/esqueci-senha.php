<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respondError('Método não permitido', 405);

$body = getBody();
$email = trim($body['email'] ?? '');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('E-mail inválido');
}

$db = getDB();

// Verifica se e-mail existe
$stmt = $db->prepare("SELECT id FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Mesmo que não exista, retorna sucesso (segurança: não revela se e-mail está cadastrado)
if (!$user) {
    respond(['ok' => true]);
}

// Gera token seguro
$token = bin2hex(random_bytes(32));
$expira = date('Y-m-d H:i:s', strtotime('+1 hour'));

// Remove tokens antigos deste e-mail
$db->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

// Salva novo token
$db->prepare("INSERT INTO password_resets (email, token, expira_em) VALUES (?, ?, ?)")
   ->execute([$email, $token, $expira]);

// Monta link de reset
$baseUrl = 'http://' . ($_SERVER['HTTP_HOST'] ?? '54.242.139.170') . '/tcc-2025-1-e-2-condconnect/Templates/redefinir-senha.html';
$link = $baseUrl . '?token=' . $token;

// Envia e-mail via Gmail SMTP
$enviado = enviarEmailReset($email, $link);

if (!$enviado) {
    respondError('Erro ao enviar e-mail. Tente novamente mais tarde.', 500);
}

respond(['ok' => true]);

// ── Função de envio via SMTP ──────────────────────────────────────────────────
function enviarEmailReset(string $para, string $link): bool {
    $host     = 'smtp.gmail.com';
    $porta    = 587;
    $usuario  = 'condconnect2025@gmail.com';
    $senha    = 'SENHA_APP_AQUI'; // ← Cole aqui a Senha de App do Gmail (16 caracteres)
    $remetente = 'CondConnect <condconnect2025@gmail.com>';

    $assunto  = 'Recuperação de senha - CondConnect';
    $corpo    = "
<html>
<body style='font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;'>
  <div style='max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
    <img src='http://54.242.139.170/tcc-2025-1-e-2-condconnect/static/assets/images/logo_comfundo.png' alt='CondConnect' style='height:60px;display:block;margin:0 auto 24px;'>
    <h2 style='color:#1e293b;font-size:22px;text-align:center;margin-bottom:8px;'>Redefinir sua senha</h2>
    <p style='color:#64748b;font-size:15px;text-align:center;margin-bottom:32px;'>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
    <a href='$link' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:16px 24px;border-radius:100px;font-size:16px;font-weight:700;margin-bottom:24px;'>Redefinir minha senha</a>
    <p style='color:#94a3b8;font-size:13px;text-align:center;'>Este link expira em <strong>1 hora</strong>.<br>Se você não solicitou isso, ignore este e-mail.</p>
    <hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>
    <p style='color:#cbd5e1;font-size:12px;text-align:center;'>© 2026 CondConnect — Centro Universitário Senac</p>
  </div>
</body>
</html>";

    $socket = @stream_socket_client("tcp://$host:$porta", $errno, $errstr, 15);
    if (!$socket) return false;

    $read = fgets($socket, 512);

    $cmds = [
        "EHLO condconnect.local\r\n",
        "STARTTLS\r\n",
    ];

    foreach ($cmds as $cmd) {
        fwrite($socket, $cmd);
        fgets($socket, 512);
    }

    // Upgrade para TLS
    stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

    $cmds2 = [
        "EHLO condconnect.local\r\n",
        "AUTH LOGIN\r\n",
        base64_encode($usuario) . "\r\n",
        base64_encode($senha) . "\r\n",
        "MAIL FROM:<condconnect2025@gmail.com>\r\n",
        "RCPT TO:<$para>\r\n",
        "DATA\r\n",
    ];

    foreach ($cmds2 as $cmd) {
        fwrite($socket, $cmd);
        fgets($socket, 512);
    }

    $headers  = "From: $remetente\r\n";
    $headers .= "To: $para\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($assunto) . "?=\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

    fwrite($socket, $headers . "\r\n" . $corpo . "\r\n.\r\n");
    $resp = fgets($socket, 512);

    fwrite($socket, "QUIT\r\n");
    fclose($socket);

    return str_starts_with(trim($resp), '250');
}
