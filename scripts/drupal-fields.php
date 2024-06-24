<?php

/**
 * @file
 * Script to print out the fields of each block entity in Drupal.
 */

// Load the entity type manager service.
$entity_type_manager = \Drupal::entityTypeManager();

// Get all custom block content types.
$block_content_type_storage = $entity_type_manager->getStorage('block_content_type');

// Load all custom block content types.
$block_content_types = $block_content_type_storage->loadMultiple();

foreach ($block_content_types as $block_content_type) {
  // Print block type ID and label.
  print "Block Type ID: " . $block_content_type->id() . "\n";
  print "Block Type Label: " . $block_content_type->label() . "\n";

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
      print "  Field Name: " . $field_name . "\n";
      // Print field type.
      print "  Field Type: " . $field_definition->getType() . "\n";
      // Print if the field is required.
      print "  Required: " . ($field_definition->isRequired() ? 'Yes' : 'No') . "\n";
    }
  }

  print "\n";
}
