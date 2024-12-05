<?php

// Small cleanup to delete erroneous folder.
if (file_exists('public:') && is_writable('public:')) {
  rmdir('public:');
}

$container = \Drupal::getContainer();
$config_factory = $container->get('config.factory');

$blocks = [
  'drupalx_theme_breadcrumbs',
  'drupalx_theme_help',
  'drupalx_theme_page_title',
];

foreach ($blocks as $block) {
  $config = $config_factory->getEditable('block.block.' . $block);
  if ($config) {
    $config->set('status', 0)->save();
  }
}
