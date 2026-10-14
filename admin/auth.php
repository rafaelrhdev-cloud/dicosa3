<?php
// auth.php — se incluye al inicio de cada página o endpoint del panel.
// Revisa que haya sesión, carga al usuario (con su rol) y ofrece
// dicosa_can() / dicosa_require_perm() para controlar los permisos.

declare(strict_types=1);

require_once __DIR__ . '/../lib/users.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

/** Usuario con sesión iniciada (se vuelve a leer en cada petición: si lo desactivan o le cambian el rol, aplica al instante). */
function dicosa_current_user(): ?array
{
    if (array_key_exists('dicosa_user', $GLOBALS)) return $GLOBALS['dicosa_user'];
    $user = null;
    if (!empty($_SESSION['dicosa_uid'])) {
        $u = dicosa_user_find_by('id', (string)$_SESSION['dicosa_uid']);
        if ($u && !empty($u['active']) && isset(dicosa_roles()[$u['role']])) $user = $u;
        else { unset($_SESSION['dicosa_uid']); }
    }
    return $GLOBALS['dicosa_user'] = $user;
}

function dicosa_deny(int $code, string $message, bool $json): void
{
    if ($json) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $message]);
    } else {
        header('Location: ' . ($code === 401 ? 'login.php' : 'dashboard.php'));
    }
    exit;
}

function dicosa_require_login(bool $isJsonEndpoint = false): void
{
    if (!dicosa_current_user()) dicosa_deny(401, 'No has iniciado sesión.', $isJsonEndpoint);
}

function dicosa_can(string $perm): bool
{
    $u = dicosa_current_user();
    return $u !== null && dicosa_role_has($u['role'], $perm);
}

function dicosa_require_perm(string $perm, bool $isJsonEndpoint = true): void
{
    dicosa_require_login($isJsonEndpoint);
    if (!dicosa_can($perm)) dicosa_deny(403, 'Tu usuario no tiene permiso para hacer esto.', $isJsonEndpoint);
}
