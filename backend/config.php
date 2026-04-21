<?php
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=www.thyagoquintas.com.br;port=3306;dbname=engenharia_16;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, 'engenharia_16', 'canariodaterra', $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Falha na conexão com o banco de dados']);
            exit;
        }
    }
    return $pdo;
}
