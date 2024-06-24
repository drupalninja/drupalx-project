<?php

/**
 * @file
 * DrupalAI custom command to generate tests.
 */

use Drupal\drupalai\DrupalAiFactory;

const PROMPT = <<<EOT
  You are an experienced Drupal 10 developer tasked with updating drupalx.install
  to add a kitchen-sink-min page that creates blocks with only required fields.
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
  // drupalx.install updated content
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

// Initialize the result array.
$block_definitions = [];

foreach ($block_content_types as $block_content_type) {
  // Initialize block type array.
  $block_type_info = [
    'id' => $block_content_type->id(),
    'label' => $block_content_type->label(),
    'fields' => [],
  ];

  // Load field definitions for this block type.
  $field_definitions = \Drupal::service('entity_field.manager')->getFieldDefinitions('block_content', $block_content_type->id());

  foreach ($field_definitions as $field_name => $field_definition) {
    // Append field information to block type array.
    $block_type_info['fields'][$field_name] = [
      'type' => $field_definition->getType(),
      'required' => $field_definition->isRequired() ? 'Yes' : 'No',
    ];
  }

  // Append block type info to result array.
  $block_definitions[] = $block_type_info;
}

// Optionally, format the result for readability.
$output = json_encode($block_definitions, JSON_PRETTY_PRINT);

$contents .= "Block Definitions (encoded in JSON):\n{$output}\n";

print "Querying AI for updated install ..." . PHP_EOL;

$ai_model = DrupalAiFactory::build('openai');

$prompt = str_replace('FILES', $files, PROMPT);

$contents = $ai_model->getChat($prompt);

$xml = @simplexml_load_string($contents);

if (!empty($xml)) {
  $file = $xml->file;

  $filename = (string) $file->filename;
  $content = (string) $file->content;

  print $content . PHP_EOL;

  print "Creating new DrupalX file: {$filename}" . PHP_EOL;

  $file_path = $install_path;
  file_put_contents($file_path, trim($content));
}
