<?php
declare(strict_types=1);

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/../lib/phpmailer/Exception.php';
require_once __DIR__ . '/../lib/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../lib/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Manda un correo avisando que llegó una solicitud de empleo nueva.
 * Nunca lanza una excepción hacia afuera: si algo falla, regresa false
 * y anota el motivo en data/mail-errors.log, para que enviar el correo
 * nunca pueda tumbar el envío de la solicitud del candidato.
 */
function dicosa_notify_new_application(array $application): bool
{
    $configPath = __DIR__ . '/../data/mail-config.php';
    if (!is_file($configPath)) {
        return false;
    }
    $config = include $configPath;
    if (!is_array($config) || empty($config['smtp_pass']) || $config['smtp_pass'] === 'PON_AQUI_TU_CONTRASEÑA_DE_APLICACION') {
        // Todavía no se configuró el correo — no es un error, solo no está listo.
        return false;
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp_user'];
        $mail->Password = $config['smtp_pass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int)$config['smtp_port'];
        $mail->CharSet = 'UTF-8';

        $mail->setFrom($config['from_email'], $config['from_name']);
        $sent = [];
        if (!empty($config['notify_to']) && filter_var($config['notify_to'], FILTER_VALIDATE_EMAIL)) {
            $mail->addAddress($config['notify_to'], $config['notify_to_name'] ?? '');
            $sent[strtolower($config['notify_to'])] = true;
        }
        // Usuarios del panel (por ejemplo Recursos humanos) que activaron "recibir aviso de nuevas solicitudes".
        foreach (dicosa_notify_recipients((string)($application['branch_id'] ?? '')) as $r) {
            if (isset($sent[strtolower($r['email'])])) continue;
            $mail->addAddress($r['email'], $r['name']);
            $sent[strtolower($r['email'])] = true;
        }
        $mail->addReplyTo($application['email'], $application['name']);

        $mail->isHTML(true);
        $mail->Subject = 'Nueva solicitud de empleo: ' . $application['name'] . ' — ' . $application['position'];

        $safeName = htmlspecialchars($application['name'], ENT_QUOTES, 'UTF-8');
        $safeEmail = htmlspecialchars($application['email'], ENT_QUOTES, 'UTF-8');
        $safePhone = htmlspecialchars($application['phone'], ENT_QUOTES, 'UTF-8');
        $safePosition = htmlspecialchars($application['position'], ENT_QUOTES, 'UTF-8');
        $safeMessage = nl2br(htmlspecialchars($application['message'] ?? '', ENT_QUOTES, 'UTF-8'));

        $mail->Body = "
            <div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;'>
              <div style='background:#1B1714;color:#FAF6F0;padding:20px 24px;border-radius:6px 6px 0 0;'>
                <h2 style='margin:0;font-size:18px;'>Nueva solicitud de empleo</h2>
              </div>
              <div style='border:1px solid #E4DACB;border-top:none;padding:24px;border-radius:0 0 6px 6px;'>
                <p style='margin:0 0 14px;'><strong>Puesto:</strong> {$safePosition}</p>
                <p style='margin:0 0 6px;'><strong>Nombre:</strong> {$safeName}</p>
                <p style='margin:0 0 6px;'><strong>Teléfono:</strong> {$safePhone}</p>
                <p style='margin:0 0 14px;'><strong>Correo:</strong> {$safeEmail}</p>
                " . ($application['message'] ? "<p style='margin:0 0 14px;'><strong>Mensaje:</strong><br>{$safeMessage}</p>" : "") . "
                <p style='margin:20px 0 0;padding-top:16px;border-top:1px solid #E4DACB;font-size:13px;color:#666;'>
                  Entra al panel de administración para ver el CV y cambiar el estado de este candidato.
                </p>
              </div>
            </div>
        ";
        $mail->AltBody = "Nueva solicitud de empleo\n\nPuesto: {$application['position']}\nNombre: {$application['name']}\nTeléfono: {$application['phone']}\nCorreo: {$application['email']}\n" . ($application['message'] ? "\nMensaje: {$application['message']}\n" : '');

        $mail->send();
        return true;
    } catch (PHPMailerException $e) {
        $logPath = __DIR__ . '/../data/mail-errors.log';
        $line = date('Y-m-d H:i:s') . ' — ' . $mail->ErrorInfo . PHP_EOL;
        @file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX);
        return false;
    }
}
