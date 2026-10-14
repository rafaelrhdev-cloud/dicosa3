<?php
declare(strict_types=1);
require __DIR__ . '/auth.php';
dicosa_require_perm('gallery.edit', true);

header('Content-Type: application/json; charset=utf-8');

function fail(string $msg, int $code = 422): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Método no permitido.', 405);
}

$slot = (int)($_POST['slot'] ?? 0);
if ($slot < 1 || $slot > 6) {
    fail('Espacio de galería inválido.');
}

if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    fail('No se recibió ninguna imagen.');
}

$file = $_FILES['photo'];

// 8MB máximo.
if ($file['size'] > 8 * 1024 * 1024) {
    fail('La imagen pesa demasiado (máximo 8MB).');
}

// Verifica el tipo real del archivo (no solo la extensión, por seguridad).
$imageInfo = @getimagesize($file['tmp_name']);
if ($imageInfo === false) {
    fail('El archivo no es una imagen válida.');
}

$mime = $imageInfo['mime'];
$allowed = ['image/jpeg', 'image/png', 'image/webp'];
if (!in_array($mime, $allowed, true)) {
    fail('Formato no permitido. Usa JPG, PNG o WEBP.');
}

if (!extension_loaded('gd')) {
    fail('El servidor no tiene la librería GD habilitada para procesar imágenes.', 500);
}

// Carga la imagen según su tipo real.
switch ($mime) {
    case 'image/jpeg':
        $image = imagecreatefromjpeg($file['tmp_name']);
        break;
    case 'image/png':
        $image = imagecreatefrompng($file['tmp_name']);
        break;
    case 'image/webp':
        $image = imagecreatefromwebp($file['tmp_name']);
        break;
    default:
        $image = false;
}

if ($image === false) {
    fail('No se pudo procesar la imagen.', 500);
}

// Si tiene transparencia (PNG), la rellena de blanco antes de convertir a JPG.
$width = imagesx($image);
$height = imagesy($image);
$flat = imagecreatetruecolor($width, $height);
$white = imagecolorallocate($flat, 255, 255, 255);
imagefill($flat, 0, 0, $white);
imagecopy($flat, $image, 0, 0, 0, 0, $width, $height);
imagedestroy($image);

$galleryDir = __DIR__ . '/../assets/gallery/';
if (!is_dir($galleryDir)) {
    mkdir($galleryDir, 0755, true);
}

$destPath = $galleryDir . "foto-{$slot}.jpg";
$saved = imagejpeg($flat, $destPath, 85);
imagedestroy($flat);

if (!$saved) {
    fail('No se pudo guardar la imagen. Revisa permisos de la carpeta assets/gallery/.', 500);
}

dicosa_audit('galeria_foto', 'Cambió la foto ' . $slot);
echo json_encode([
    'success' => true,
    'url' => "../assets/gallery/foto-{$slot}.jpg?t=" . time(),
]);
