<?php
require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function setCORSHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respondError(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth(): int {
    if (empty($_SESSION['user_id'])) {
        respondError('Não autenticado. Faça login para continuar.', 401);
    }
    return (int) $_SESSION['user_id'];
}

function requireAdmin(): void {
    requireAuth();
    if (($_SESSION['user_role'] ?? '') !== 'admin') {
        respondError('Acesso negado. Permissão de administrador necessária.', 403);
    }
}

function getBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function currentUserId(): ?int {
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

function currentUserRole(): string {
    return $_SESSION['user_role'] ?? 'usuario';
}

function notificar(int $userId, string $tipo, string $titulo, string $mensagem = '', string $link = ''): void {
    try {
        $db = getDB();
        $stmt = $db->prepare(
            "INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$userId, $tipo, $titulo, $mensagem, $link]);
    } catch (Exception $e) {
        // Notificação é não-crítica, ignora falhas
    }
}

function formatarPreco(float $preco): string {
    return 'R$ ' . number_format($preco, 2, ',', '.');
}
