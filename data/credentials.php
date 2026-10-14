<?php
// Credenciales del panel de administración DICOSA.
// Este archivo es .php (no .json) a propósito: si alguien intenta abrirlo
// desde el navegador, el servidor lo EJECUTA en vez de mostrarlo como texto,
// así que el hash de la contraseña nunca queda expuesto públicamente.
//
// Contraseña por defecto: Dicosa2026!
// (se puede cambiar desde el panel, en Ajustes > Cambiar contraseña,
// o generando un hash nuevo con: php -r "echo password_hash('tu_clave', PASSWORD_DEFAULT);")

return [
    'username' => 'admin',
    'password_hash' => '$2y$10$6mYqMOFmtads70pYbm6IVeTaPcZrFyUpHdmb/HJVPwUUwK.LKDAy.',
];
