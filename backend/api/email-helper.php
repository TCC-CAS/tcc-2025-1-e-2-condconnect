<?php
function smtpSend(string $para, string $assunto, string $corpo): bool {
    $host    = 'ssl://smtp.gmail.com';
    $porta   = 465;
    $usuario = 'condconnect2025@gmail.com';
    $senha   = 'roke ejvm okut ivgr';

    $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
    $socket = @stream_socket_client($host . ':' . $porta, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$socket) { error_log("SMTP connect failed: $errstr ($errno)"); return false; }

    fgets($socket, 512);
    smtpCmd2($socket, 'EHLO condconnect.local');
    smtpCmd2($socket, 'AUTH LOGIN');
    smtpCmd2($socket, base64_encode($usuario));
    $authResp = smtpCmd2($socket, base64_encode($senha));
    if (!str_starts_with(trim($authResp), '235')) { fclose($socket); return false; }

    smtpCmd2($socket, "MAIL FROM:<$usuario>");
    smtpCmd2($socket, "RCPT TO:<$para>");
    smtpCmd2($socket, 'DATA');

    $subject = '=?UTF-8?B?' . base64_encode($assunto) . '?=';
    $msg  = "From: CondConnect <$usuario>\r\nTo: $para\r\nSubject: $subject\r\n";
    $msg .= "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n";
    $msg .= $corpo . "\r\n.";

    $resp = smtpCmd2($socket, $msg);
    smtpCmd2($socket, 'QUIT');
    fclose($socket);
    return str_starts_with(trim($resp), '250');
}

function smtpCmd2($socket, string $cmd): string {
    fwrite($socket, $cmd . "\r\n");
    $resp = '';
    while (($line = fgets($socket, 512)) !== false) {
        $resp = $line;
        if (substr($line, 3, 1) === ' ') break;
    }
    return $resp;
}

function emailPedidoLayout(string $titulo, string $conteudo): string {
    return "<html><body style='font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;'>
  <div style='max-width:500px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
    <h2 style='color:#1e293b;font-size:20px;text-align:center;margin-bottom:8px;'>$titulo</h2>
    $conteudo
    <hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>
    <p style='color:#cbd5e1;font-size:12px;text-align:center;'>© 2026 CondConnect — Centro Universitário Senac</p>
  </div>
</body></html>";
}
