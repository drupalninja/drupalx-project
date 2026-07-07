<?php

declare(strict_types=1);

namespace Drupal\dx_image\TwigExtension;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileSystemInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Provides the `dx_image` Twig function for the drupalx_theme SDCs.
 *
 * The section SDCs receive an image as a plain `{ src, alt }` — a RAW file URL
 * — because the SAME component tree renders in the static build (external src)
 * AND in Drupal/Canvas (managed-file src). A bare `<img src="{{ image.src }}">`
 * therefore ships the FULL-SIZE original to anonymous visitors: no
 * width-stepped srcset, no WebP. That tanks mobile LCP, performance, and SEO.
 *
 * `dx_image(image, sizes)` closes that gap WITHOUT breaking the static-first
 * contract. Given the image map (or a bare src) it resolves the managed file
 * and returns a `srcset` of width-stepped WebP derivatives built from the
 * `uncropped_*w_webp` styles the drupalx_canvas recipe ships, plus intrinsic
 * width/height and the passed `sizes`. When the src is NOT a managed Drupal
 * file — the static build, an external URL, or an SVG — it returns
 * `srcset = null` and the twig falls back to the plain <img src>.
 *
 * Usage in an SDC twig:
 *   {% set io = dx_image(image, '100vw') %}
 *   <img src="{{ image.src }}" alt="{{ image.alt }}"
 *     {% if io.srcset %}srcset="{{ io.srcset }}" sizes="{{ io.sizes }}"{% endif %}
 *     {% if io.width %}width="{{ io.width }}" height="{{ io.height }}"{% endif %}>
 *
 * SDCs render through the component render element (not theme()), so a
 * hook_preprocess_<sdc> never fires and a theme cannot register a Twig
 * extension — which is why this lives in a module and is called from the twig.
 */
final class DxImageExtension extends AbstractExtension {

  /**
   * Width step → the `uncropped_<w>w_webp` image style (WebP via GD).
   */
  private const WIDTH_STYLES = [
    300 => 'uncropped_300w_webp',
    500 => 'uncropped_500w_webp',
    600 => 'uncropped_600w_webp',
    700 => 'uncropped_700w_webp',
    720 => 'uncropped_720w_webp',
    960 => 'uncropped_960w_webp',
    1200 => 'uncropped_1200w_webp',
    1600 => 'uncropped_1600w_webp',
  ];

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly FileSystemInterface $fileSystem,
  ) {}

  public function getFunctions(): array {
    return [
      new TwigFunction('dx_image', [$this, 'sources']),
    ];
  }

  /**
   * Resolve an SDC image to responsive, modern-format sources.
   *
   * @param mixed $image
   *   The SDC image map (`{ src, alt, … }`) or a bare src string.
   * @param string $sizes
   *   The `sizes` hint for the responsive srcset (passed straight through).
   *
   * @return array
   *   [ 'srcset' => string|null, 'sizes' => string, 'width' => int|null,
   *     'height' => int|null ]. `srcset` is null when not optimizable, so the
   *   twig falls back to the plain <img src>.
   */
  public function sources(mixed $image, string $sizes = '100vw'): array {
    $empty = ['srcset' => NULL, 'sizes' => $sizes, 'width' => NULL, 'height' => NULL];

    $src = is_array($image) ? ($image['src'] ?? NULL) : (is_string($image) ? $image : NULL);
    if (!is_string($src) || $src === '' || preg_match('/\.svg(\?|$)/i', $src)) {
      return $empty;
    }

    // Map the rendered URL back to its public:// URI (public files only; never
    // re-style an already-derived style image).
    $path = parse_url($src, PHP_URL_PATH) ?: $src;
    $needle = '/sites/default/files/';
    $pos = strpos($path, $needle);
    if ($pos === FALSE) {
      return $empty;
    }
    $relative = substr($path, $pos + strlen($needle));
    if (str_starts_with($relative, 'styles/')) {
      return $empty;
    }
    $uri = 'public://' . rawurldecode($relative);

    try {
      $files = $this->entityTypeManager->getStorage('file')
        ->loadByProperties(['uri' => $uri]);
    }
    catch (\Throwable $e) {
      return $empty;
    }
    $file = $files ? reset($files) : NULL;
    if (!$file) {
      return $empty;
    }

    $fileUri = $file->getFileUri();
    $styleStorage = $this->entityTypeManager->getStorage('image_style');
    $srcset = [];
    foreach (self::WIDTH_STYLES as $width => $styleId) {
      if ($style = $styleStorage->load($styleId)) {
        $srcset[] = $style->buildUrl($fileUri) . ' ' . $width . 'w';
      }
    }
    if (!$srcset) {
      return $empty;
    }

    $w = $h = NULL;
    if ($real = $this->fileSystem->realpath($fileUri)) {
      if ($info = @getimagesize($real)) {
        [$w, $h] = [(int) $info[0], (int) $info[1]];
      }
    }

    return [
      'srcset' => implode(', ', $srcset),
      'sizes' => $sizes,
      'width' => $w,
      'height' => $h,
    ];
  }

}
