<?php
require_once __DIR__ . '/../../helpers.php';
setCORSHeaders();

session_destroy();
respond(['message' => 'Logout realizado com sucesso']);
