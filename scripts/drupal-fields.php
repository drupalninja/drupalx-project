<?php

/**
 * @file
 * Script to output the fields of each block entity and paragraph type in Drupal as a CSV.
 */

// Load the entity type manager service.
$entity_type_manager = \Drupal::entityTypeManager();

// Get all custom block content types.
$block_content_type_storage = $entity_type_manager->getStorage('block_content_type');

// Load all custom block content types.
$block_content_types = $block_content_type_storage->loadMultiple();

// Get all paragraph types.
$paragraph_type_storage = $entity_type_manager->getStorage('paragraphs_type');

// Load all paragraph types.
$paragraph_types = $paragraph_type_storage->loadMultiple();

// Open a file in write mode.
$csv_file = fopen('../scripts/drupal-config.csv', 'w');

// Write the header row to the CSV.
fputcsv($csv_file, ['Entity Type', 'Type ID', 'Type Label', 'Field Name', 'Field Type', 'Required']);

// Function to write field definitions to CSV.
function write_field_definitions_to_csv($csv_file, $entity_type, $type_id, $type_label, $field_definitions)
{
  foreach ($field_definitions as $field_name => $field_definition) {
    // Check if the field is custom, or if it is 'title' or 'body'.
    if (
      $field_definition->getName() !== 'id' && $field_definition->getName() !== 'uuid' &&
      ($field_definition->getName() == 'title' || $field_definition->getName() == 'body' ||
        strpos($field_definition->getName(), 'field_') === 0)
    ) {
      // Get field details.
      $field_type = $field_definition->getType();
      $is_required = $field_definition->isRequired() ? 'Yes' : 'No';

      // Write the row to the CSV.
      fputcsv($csv_file, [$entity_type, $type_id, $type_label, $field_name, $field_type, $is_required]);
    }
  }
}

// Process block content types.
foreach ($block_content_types as $block_content_type) {
  // Get block type ID and label.
  $block_type_id = $block_content_type->id();
  $block_type_label = $block_content_type->label();

  // Load field definitions for this block type.
  $field_definitions = \Drupal::service('entity_field.manager')->getFieldDefinitions('block_content', $block_type_id);

  // Write block content type field definitions to CSV.
  write_field_definitions_to_csv($csv_file, 'block_content', $block_type_id, $block_type_label, $field_definitions);
}

// Process paragraph types.
foreach ($paragraph_types as $paragraph_type) {
  // Get paragraph type ID and label.
  $paragraph_type_id = $paragraph_type->id();
  $paragraph_type_label = $paragraph_type->label();

  // Load field definitions for this paragraph type.
  $field_definitions = \Drupal::service('entity_field.manager')->getFieldDefinitions('paragraph', $paragraph_type_id);

  // Write paragraph type field definitions to CSV.
  write_field_definitions_to_csv($csv_file, 'paragraph', $paragraph_type_id, $paragraph_type_label, $field_definitions);
}

// Close the CSV file.
fclose($csv_file);
