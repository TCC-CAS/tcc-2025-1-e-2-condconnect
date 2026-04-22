<?php
require_once __DIR__ . '/../helpers.php';
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respondError('Método não permitido', 405);

$body    = getBody();
$nome    = trim($body['nome']    ?? '');
$email   = trim($body['email']   ?? '');
$assunto = trim($body['assunto'] ?? '');
$mensagem = trim($body['mensagem'] ?? '');

if (!$nome || !$email || !$mensagem) {
    respondError('Preencha todos os campos obrigatórios.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('E-mail inválido.');
}

$enviado = enviarEmailContato($nome, $email, $assunto, $mensagem);

if (!$enviado) {
    respondError('Erro ao enviar mensagem. Tente novamente mais tarde.', 500);
}

respond(['ok' => true]);

function smtpCmd($socket, string $cmd): string {
    fwrite($socket, $cmd . "\r\n");
    $resp = '';
    while (($line = fgets($socket, 512)) !== false) {
        $resp = $line;
        if (substr($line, 3, 1) === ' ') break;
    }
    return $resp;
}

function enviarEmailContato(string $nome, string $replyTo, string $assunto, string $mensagem): bool {
    $host    = 'ssl://smtp.gmail.com';
    $porta   = 465;
    $usuario = 'condconnect2025@gmail.com';
    $senha   = 'roke ejvm okut ivgr';

    $assuntoLabel = match($assunto) {
        'suporte'  => 'Suporte técnico',
        'conta'    => 'Problema com minha conta',
        'pedido'   => 'Problema com pedido',
        'denuncia' => 'Denúncia',
        'sugestao' => 'Sugestão de melhoria',
        default    => 'Outro',
    };

    $corpo = "<html><body style='font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;'>
  <div style='max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
    <h2 style='color:#1e293b;font-size:20px;margin-bottom:4px;'>📩 Nova mensagem de contato</h2>
    <p style='color:#64748b;font-size:13px;margin-bottom:24px;'>Recebida pelo formulário do CondConnect</p>
    <table style='width:100%;border-collapse:collapse;font-size:14px;'>
      <tr><td style='padding:10px 0;color:#64748b;width:100px;'>Nome</td><td style='padding:10px 0;color:#1e293b;font-weight:600;'>$nome</td></tr>
      <tr><td style='padding:10px 0;color:#64748b;'>E-mail</td><td style='padding:10px 0;color:#1e293b;font-weight:600;'>$replyTo</td></tr>
      <tr><td style='padding:10px 0;color:#64748b;'>Assunto</td><td style='padding:10px 0;color:#1e293b;font-weight:600;'>$assuntoLabel</td></tr>
    </table>
    <hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;'>
    <p style='color:#64748b;font-size:13px;margin-bottom:8px;font-weight:600;'>Mensagem:</p>
    <p style='color:#1e293b;font-size:15px;line-height:1.6;white-space:pre-wrap;'>$mensagem</p>
    <hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>
    <p style='color:#cbd5e1;font-size:12px;text-align:center;'>© 2026 CondConnect — Centro Universitário Senac</p>
  </div>
</body></html>";

    $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
    $socket = @stream_socket_client($host . ':' . $porta, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$socket) {
        error_log("SMTP connect failed: $errstr ($errno)");
        return false;
    }

    fgets($socket, 512);
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
    smtpCmd($socket, "RCPT TO:<$usuario>");
    smtpCmd($socket, 'DATA');

    $subjectEncoded = '=?UTF-8?B?' . base64_encode("Contato CondConnect: $assuntoLabel") . '?=';
    $msg  = "From: CondConnect <$usuario>\r\n";
    $msg .= "To: $usuario\r\n";
    $msg .= "Reply-To: $nome <$replyTo>\r\n";
    $msg .= "Subject: $subjectEncoded\r\n";
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
