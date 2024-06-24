<?php

/**
 * @file
 * DrupalAI custom command to generate tests.
 */

use Drupal\drupalai\DrupalAiFactory;

const PROMPT = <<<EOT
  You are an experienced Drupal 10 developer tasked with updating drupalx.install
  to add a kitchen-sink-min page that creates the same blocks as the kitchen-sink
  page but with only required fields for each block.
  Consider Drupal best practices as you develop this test suite.

  Files to refactor:
  FILES

  Before proceeding, ensure adherence to Drupal 10 coding standards and best practices.
  Any issues encountered during development should be reported as Drupal messages.

  Important Guidelines:

  Your task is to provide a response in XML format, adhering to the example structure provided below.
  Ensure proper syntax and closure of all XML tags. Do not add any extra indentation to the XML response.

  Example Structure:
  <files>
  <file>
  <filename>drupalx.install</filename>
  <content>
  // drupalx.install file contents
  </content>
  </file>
  </files>
  EOT;

$install_path = './profiles/custom/drupalx/drupalx.install';
$contents = file_get_contents($install_path);
$files = "File: drupalx.install\nContent: {$contents}\n\n";

// Load the entity type manager service.
$entity_type_manager = \Drupal::entityTypeManager();

// Get all custom block content types.
$block_content_type_storage = $entity_type_manager->getStorage('block_content_type');

// Load all custom block content types.
$block_content_types = $block_content_type_storage->loadMultiple();

$output = '';

foreach ($block_content_types as $block_content_type) {
  // Print block type ID and label.
  $output .= "Block Type ID: " . $block_content_type->id() . "\n";
  $output .= "Block Type Label: " . $block_content_type->label() . "\n";

  // Load field definitions for this block type.
  $field_definitions = \Drupal::service('entity_field.manager')->getFieldDefinitions('block_content', $block_content_type->id());

  foreach ($field_definitions as $field_name => $field_definition) {
    // Check if the field is custom, or if it is 'title' or 'body'.
    if (
      $field_definition->getName() !== 'id' && $field_definition->getName() !== 'uuid' &&
      ($field_definition->getName() == 'title' || $field_definition->getName() == 'body' ||
        strpos($field_definition->getName(), 'field_') === 0)
    ) {

      // Print field name.
      $output .= "  Field Name: " . $field_name . "\n";
      // Print field type.
      $output .= "  Field Type: " . $field_definition->getType() . "\n";
      // Print if the field is required.
      $output .= "  Required: " . ($field_definition->isRequired() ? 'Yes' : 'No') . "\n";
    }
  }

  $output .= "\n";
}


$files .= "Block Definitions :\n{$output}\n";

print "Querying AI for updated install ..." . PHP_EOL;

$ai_model = DrupalAiFactory::build('gemini');

$prompt = str_replace('FILES', $files, PROMPT);

$contents = $ai_model->getChat($prompt);

$xml = @simplexml_load_string($contents);

if (!empty($xml)) {
  foreach ($xml->file as $file) {
    $filename = (string) $file->filename;
    $content = (string) $file->content;

    print "Creating file: {$filename} ..." . PHP_EOL;

    $file_path = $path . '/' . $filename;
    file_put_contents($file_path, trim($content));
  }
}
