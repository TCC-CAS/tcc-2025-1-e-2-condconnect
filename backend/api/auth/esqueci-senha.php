<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respondError('Método não permitido', 405);

$body  = getBody();
$email = trim($body['email'] ?? '');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('E-mail inválido');
}

$db = getDB();

$stmt = $db->prepare("SELECT id FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Retorna sucesso mesmo se e-mail não existir (não revela cadastros)
if (!$user) {
    respond(['ok' => true]);
}

$token  = bin2hex(random_bytes(32));
$expira = date('Y-m-d H:i:s', strtotime('+1 hour'));

$db->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);
$db->prepare("INSERT INTO password_resets (email, token, expira_em) VALUES (?, ?, ?)")
   ->execute([$email, $token, $expira]);

$host    = $_SERVER['HTTP_HOST'] ?? '54.242.139.170';
$baseUrl = "http://$host/tcc-2025-1-e-2-condconnect/Templates/redefinir-senha.html";
$link    = $baseUrl . '?token=' . $token;

$enviado = enviarEmailReset($email, $link);

if (!$enviado) {
    respondError('Erro ao enviar e-mail. Tente novamente mais tarde.', 500);
}

respond(['ok' => true]);

// ── SMTP via SSL porta 465 ────────────────────────────────────────────────────
function smtpCmd($socket, string $cmd): string {
    fwrite($socket, $cmd . "\r\n");
    $resp = '';
    while (($line = fgets($socket, 512)) !== false) {
        $resp = $line;
        if (substr($line, 3, 1) === ' ') break; // fim de resposta multi-linha
    }
    return $resp;
}

function enviarEmailReset(string $para, string $link): bool {
    $host    = 'ssl://smtp.gmail.com';
    $porta   = 465;
    $usuario = 'condconnect2025@gmail.com';
    $senha   = 'roke ejvm okut ivgr';

    $corpo = "<html><body style='font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;'>
  <div style='max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
    <h2 style='color:#1e293b;font-size:22px;text-align:center;margin-bottom:8px;'>🔐 Redefinir sua senha</h2>
    <p style='color:#64748b;font-size:15px;text-align:center;margin-bottom:32px;'>Recebemos uma solicitação para redefinir a senha da sua conta CondConnect.</p>
    <a href='$link' style='display:block;background:#00a6a6;color:white;text-decoration:none;text-align:center;padding:16px 24px;border-radius:100px;font-size:16px;font-weight:700;margin-bottom:24px;'>Redefinir minha senha</a>
    <p style='color:#94a3b8;font-size:13px;text-align:center;'>Este link expira em <strong>1 hora</strong>.<br>Se você não solicitou isso, ignore este e-mail.</p>
    <hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>
    <p style='color:#cbd5e1;font-size:12px;text-align:center;'>© 2026 CondConnect — Centro Universitário Senac</p>
  </div>
</body></html>";

    $ctx = stream_context_create([
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
        ]
    ]);

    $socket = @stream_socket_client($host . ':' . $porta, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$socket) {
        error_log("SMTP connect failed: $errstr ($errno)");
        return false;
    }

    fgets($socket, 512); // saudação

    smtpCmd($socket, 'EHLO condconnect.local');
    smtpCmd($socket, 'AUTH LOGIN');
    smtpCmd($socket, base64_encode($usuario));
    $authResp = smtpCmd($socket, base64_encode($senha));

    if (!str_starts_with(trim($authResp), '235')) {
        error_log("SMTP auth failed: $authResp");
        fclose($socket);
        return false;
    }

    smtpCmd($socket, "MAIL FROM:<$usuario>");
    smtpCmd($socket, "RCPT TO:<$para>");
    smtpCmd($socket, 'DATA');

    $assunto = '=?UTF-8?B?' . base64_encode('Recuperação de senha - CondConnect') . '?=';
    $msg  = "From: CondConnect <$usuario>\r\n";
    $msg .= "To: $para\r\n";
    $msg .= "Subject: $assunto\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "\r\n";
    $msg .= $corpo;
    $msg .= "\r\n.";

    $resp = smtpCmd($socket, $msg);
    smtpCmd($socket, 'QUIT');
    fclose($socket);

    $ok = str_starts_with(trim($resp), '250');
    if (!$ok) error_log("SMTP send failed: $resp");
    return $ok;
}
