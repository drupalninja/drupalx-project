<?php

/**
 * Drush command to rename files from block_content to paragraph
 * and replace references within each file.
 */

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Finder\Finder;

$directory = 'profiles/custom/drupalx/config/install';

rename_files_and_replace_references($directory);

/**
 * Rename files from block_content to paragraph and replace references within each file.
 *
 * @param string $directory
 *   The directory to search for files.
 */
function rename_files_and_replace_references($directory) {
  $fs = new Filesystem();
  $finder = new Finder();

  // Find all YAML files in the specified directory that contain 'block_content' in their name.
  $finder->files()->in($directory)->name('*block_content*.yml');

  foreach ($finder as $file) {
    $filePath = $file->getRealPath();
    $fileName = $file->getFilename();
    $newFileName = str_replace('block_content', 'paragraph', $fileName);

    // Read the file content.
    $content = file_get_contents($filePath);

    // Replace block_content with paragraph.
    $newContent = str_replace('block_content', 'paragraph', $content);

    // Write the modified content to the new file.
    $newFilePath = $file->getPath() . DIRECTORY_SEPARATOR . $newFileName;
    file_put_contents($newFilePath, $newContent);

    // Optionally, delete the old file.
    $fs->remove($filePath);

    // Output to confirm the change.
    print "Renamed and updated: {$fileName} to {$newFileName} \n";
  }
}
