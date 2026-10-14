<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';
if (dicosa_current_user()) dicosa_audit('logout', 'Cerró sesión');
$_SESSION = [];
session_destroy();
header('Location: login.php');
exit;
