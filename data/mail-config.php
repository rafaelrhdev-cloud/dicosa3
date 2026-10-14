<?php
// Configuración de correo para las notificaciones de bolsa de trabajo.
// Es .php a propósito: si alguien lo abre desde el navegador, el servidor
// lo EJECUTA en vez de mostrarlo, así que la contraseña nunca se expone.
//
// ====================================================================
// CÓMO CONSEGUIR LA "CONTRASEÑA DE APLICACIÓN" DE GMAIL (smtp_pass):
// 1. Entra a https://myaccount.google.com/security con la cuenta que
//    va a ENVIAR los correos (puede ser la misma kusdarr2@gmail.com,
//    u otra cuenta dedicada a esto).
// 2. Activa la "Verificación en 2 pasos" si no la tienes activada
//    (Gmail no deja crear contraseñas de aplicación sin esto).
// 3. Ve a https://myaccount.google.com/apppasswords
// 4. Crea una nueva contraseña de aplicación (ponle de nombre "DICOSA
//    Sitio Web" para identificarla). Gmail te va a dar 16 caracteres
//    tipo "abcd efgh ijkl mnop" — cópialos SIN espacios abajo.
// 5. NO uses tu contraseña normal de Gmail aquí, solo la de aplicación.
// ====================================================================

return [
    // Cuenta que ENVÍA el correo (debe ser una cuenta de Gmail real).
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_user' => 'kusdarr2@gmail.com',       // <-- cambia esto si usas otra cuenta para enviar
    'smtp_pass' => 'PON_AQUI_TU_CONTRASEÑA_DE_APLICACION',  // <-- los 16 caracteres, sin espacios
    'from_email' => 'kusdarr2@gmail.com',      // <-- debe ser igual a smtp_user en Gmail
    'from_name' => 'Sitio Web DICOSA',

    // A dónde se manda la notificación cuando llega un candidato nuevo.
    'notify_to' => 'kusdarr2@gmail.com',
    'notify_to_name' => 'DICOSA',

    // Si algo falla al enviar el correo, ¿debe eso impedir que se guarde
    // la solicitud del candidato? NO — siempre debe quedar en falso.
    // El candidato no debe perder su solicitud por un problema de correo.
    'fail_silently' => true,
];
