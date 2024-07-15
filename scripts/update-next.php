<?php

/**
 * @file
 * DrupalAI custom command.
 */

$path = './components';

$component_directories = array_diff(scandir($path), ['.', '..']);

foreach ($component_directories as $component) {
  $newComponentName = ucfirst($component);
  $oldPath = $path . '/' . $component;
  $newPath = $path . '/' . $newComponentName;
  rename($oldPath, $newPath);
  echo "Renamed $component to $newComponentName\n";
}
