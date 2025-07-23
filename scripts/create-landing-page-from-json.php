<?php

/**
 * @file
 * Drush script to create a landing page from JSON structure.
 * 
 * Usage: drush scr scripts/create-landing-page-from-json.php
 */

use Drupal\node\Entity\Node;
use Drupal\Core\Session\AccountInterface;

// For testing, use the LA County JSON file - use relative path from Drupal root
$json_file = 'scripts/lacounty_gov_2025-07-19T13-33-15-685Z_landing_page.json';

// Convert to absolute path for file operations  
$absolute_path = DRUPAL_ROOT . '/../' . $json_file;

echo "Creating landing page from JSON: $json_file\n";

// Validate JSON file exists
if (!file_exists($absolute_path)) {
  echo "Error: JSON file not found: $absolute_path\n";
  echo "Working directory: " . getcwd() . "\n";
  echo "DRUPAL_ROOT: " . DRUPAL_ROOT . "\n";
  exit(1);
}

// Use absolute path for file operations
$json_file = realpath($absolute_path);

/**
 * Load and validate JSON data
 */
function loadAndValidateJson($json_file) {
  $json_content = file_get_contents($json_file);
  if ($json_content === FALSE) {
    throw new Exception("Cannot read JSON file: $json_file");
  }
  
  $data = json_decode($json_content, TRUE);
  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception("Invalid JSON: " . json_last_error_msg());
  }
  
  // Validate required structure
  if (!isset($data['page_title']) || !isset($data['components']) || !is_array($data['components'])) {
    throw new Exception("Invalid JSON structure: missing page_title or components");
  }
  
  return $data;
}

/**
 * Transform our JSON format to drupalx_ai component format
 */
function transformJsonToDrupalxFormat($data) {
  $components = [];
  
  foreach ($data['components'] as $weight => $component) {
    if (!isset($component['type']) || !isset($component['fields'])) {
      echo "Warning: Skipping invalid component at weight $weight\n";
      continue;
    }
    
    $drupal_component = [
      'type' => strtolower($component['type']), // Normalize case
    ];
    
    // Map fields based on component type and field structure
    foreach ($component['fields'] as $field_name => $field_value) {
      // If AI already generated proper field names, use them directly
      if (strpos($field_name, 'field_') === 0) {
        $drupal_field_name = $field_name;
        $original_field_name = str_replace('field_', '', $field_name);
      } else {
        $original_field_name = $field_name;
        $drupal_field_name = getDrupalFieldName($field_name);
      }
      
      $drupal_component[$drupal_field_name] = transformFieldValue($original_field_name, $field_value, $component['type']);
    }
    
    // Add default values for required fields that might be missing
    if ($component['type'] === 'sidebyside') {
      if (!isset($drupal_component['field_sidebyside_layout'])) {
        $drupal_component['field_sidebyside_layout'] = 'left';
      }
    }
    
    $components[] = $drupal_component;
  }
  
  return $components;
}

/**
 * Get child paragraph type for a field
 */
function getChildTypeForField($field_name) {
  $child_type_mapping = [
    'cards' => 'card',
    'card' => 'card',
    'accordion_items' => 'accordion_item',
    'accordion_item' => 'accordion_item',
    'carousel_items' => 'carousel_item',
    'carousel_item' => 'carousel_item',
    'pricing_cards' => 'pricing_card',
  ];
  
  return $child_type_mapping[$field_name] ?? 'card';
}

/**
 * Get proper Drupal field names
 */
function getDrupalFieldName($field_name) {
  // Direct mapping to correct Drupal field names
  $field_mapping = [
    'heading' => 'field_title',
    'title' => 'field_title',
    'summary' => 'field_summary', // Use field_summary for sidebyside, not field_body
    'body' => 'field_body',
    'eyebrow' => 'field_eyebrow',
    'media' => 'field_media',
    'link' => 'field_link',
    'link_2' => 'field_link_2',
    'quote' => 'field_quote',
    'author' => 'field_author',
    'job_title' => 'field_job_title',
    'features' => 'field_features',
    'cards' => 'field_card',
    'card' => 'field_card', // Handle both formats
    'accordion_items' => 'field_accordion_item',
    'accordion_item' => 'field_accordion_item', // Handle both formats
    'carousel_items' => 'field_carousel_item',
    'carousel_item' => 'field_carousel_item', // Handle both formats
    'pricing_cards' => 'field_pricing_cards',
    'media_items' => 'field_media_item',
  ];
  
  return $field_mapping[$field_name] ?? 'field_' . $field_name;
}

/**
 * Transform field values to Drupal format
 */
function transformFieldValue($field_name, $field_value, $component_type) {
  // Handle different field types
  switch ($field_name) {
    case 'summary':
    case 'body':
      // Convert text to formatted text field
      if (is_string($field_value)) {
        // For card components, use plain text for summary
        if ($component_type === 'card') {
          return $field_value; // Plain text only for cards
        }
        // For other components, use formatted text
        return [
          'value' => '<p>' . $field_value . '</p>',
          'format' => 'restricted_html',
        ];
      }
      return $field_value;
      
    case 'media':
      // Convert media reference - create proper media entity structure
      if (is_array($field_value) && isset($field_value['alt'])) {
        return [
          'type' => 'media',
          'alt' => $field_value['alt'],
        ];
      }
      return $field_value;
      
    case 'link':
    case 'link_2':
      // Convert link to Drupal format
      if (is_string($field_value)) {
        return [
          'uri' => 'internal:' . $field_value,
          'title' => 'Learn More',
        ];
      }
      if (is_array($field_value) && isset($field_value['url'])) {
        return [
          'uri' => 'internal:' . $field_value['url'],
          'title' => $field_value['title'] ?? 'Learn More',
        ];
      }
      return $field_value;
      
    case 'cards':
    case 'card':
    case 'accordion_items':
    case 'accordion_item':
    case 'carousel_items':
    case 'carousel_item':
    case 'pricing_cards':
      // Handle nested components
      if (is_array($field_value)) {
        $nested_components = [];
        foreach ($field_value as $nested_item) {
          // Handle both formats: with explicit type/fields structure, or direct field structure
          if (isset($nested_item['type']) && isset($nested_item['fields'])) {
            // Format: {"type": "card", "fields": {...}}
            $nested_component = ['type' => $nested_item['type']];
            foreach ($nested_item['fields'] as $nested_field => $nested_value) {
              $nested_drupal_field = getDrupalFieldName($nested_field);
              $nested_component[$nested_drupal_field] = transformFieldValue($nested_field, $nested_value, $nested_item['type']);
            }
            $nested_components[] = $nested_component;
          } else {
            // Format: {"title": "...", "summary": "...", ...} or {"field_title": "...", ...}
            // Determine child type from the parent field name
            $parent_field_for_child = $field_name; // Use the current field name context
            $child_type = getChildTypeForField($parent_field_for_child);
            $nested_component = ['type' => $child_type];
            foreach ($nested_item as $nested_field => $nested_value) {
              // Handle both field_ prefixed and non-prefixed nested fields
              if (strpos($nested_field, 'field_') === 0) {
                $nested_drupal_field = $nested_field;
                $nested_original_field = str_replace('field_', '', $nested_field);
              } else {
                $nested_original_field = $nested_field;
                $nested_drupal_field = getDrupalFieldName($nested_field);
              }
              $nested_component[$nested_drupal_field] = transformFieldValue($nested_original_field, $nested_value, $child_type);
            }
            $nested_components[] = $nested_component;
          }
        }
        return $nested_components;
      }
      return $field_value;
      
    case 'features':
      // Convert features array to bullet paragraph entities for sidebyside
      if (is_array($field_value)) {
        if ($component_type === 'sidebyside') {
          // Create bullet paragraph entities for features
          $feature_bullets = [];
          foreach ($field_value as $feature) {
            $feature_bullets[] = [
              'type' => 'bullet',
              'field_icon' => 'fa-star',
              'field_summary' => [
                'value' => '<p>' . $feature . '</p>',
                'format' => 'restricted_html',
              ],
            ];
          }
          return $feature_bullets;
        } else {
          // For other components, convert to HTML list
          return [
            'value' => '<ul><li>' . implode('</li><li>', $field_value) . '</li></ul>',
            'format' => 'restricted_html',
          ];
        }
      }
      return $field_value;
      
    default:
      return $field_value;
  }
}

/**
 * Get current user ID or use anonymous
 */
function getCurrentUserId() {
  $current_user = \Drupal::currentUser();
  return $current_user->id() ?: 1; // Default to user 1 if anonymous
}

// Main execution
try {
  echo "Step 1: Loading JSON data...\n";
  $data = loadAndValidateJson($json_file);
  
  echo "Step 2: Transforming to drupalx_ai format...\n";
  $components = transformJsonToDrupalxFormat($data);
  
  echo "Found " . count($components) . " components to create\n";
  
  echo "Step 3: Creating landing page node...\n";
  $page_title = $data['page_title'] ?? 'AI Generated Landing Page';
  $user_id = getCurrentUserId();
  
  // Create the landing page node
  $node = Node::create([
    'type' => 'landing',
    'title' => $page_title,
    'uid' => $user_id,
    'status' => 1, // Published
    'field_hide_page_title' => TRUE,
  ]);
  $node->save();
  
  echo "Created node ID: " . $node->id() . "\n";
  
  echo "Step 4: Creating paragraph components...\n";
  
  // Get the paragraph service
  $paragraph_service = \Drupal::service('drupalx_ai.paragraph_service');
  
  // Save components to the node
  $paragraph_ids = $paragraph_service->saveEntitiesToNode($node->id(), $components);
  
  echo "Created " . count($paragraph_ids) . " paragraph entities\n";
  
  echo "Step 5: Final validation...\n";
  
  // Reload the node to verify it was created properly
  $node = Node::load($node->id());
  if (!$node) {
    throw new Exception("Failed to load created node");
  }
  
  // Check if field_content has paragraphs
  if ($node->hasField('field_content')) {
    $field_content = $node->get('field_content');
    $paragraph_count = count($field_content);
    echo "Node has $paragraph_count paragraph references\n";
  }
  
  echo "\n=== LANDING PAGE CREATION COMPLETE ===\n";
  echo "Page Title: $page_title\n";
  echo "Node ID: " . $node->id() . "\n";
  echo "Node URL: /node/" . $node->id() . "\n";
  
  // Get the site base URL for full URL
  $base_url = \Drupal::request()->getSchemeAndHttpHost();
  echo "Full URL: $base_url/node/" . $node->id() . "\n";
  
  echo "\n=== SUMMARY ===\n";
  echo "✅ Successfully created landing page from JSON\n";
  echo "✅ Created " . count($paragraph_ids) . " paragraph components\n";
  echo "✅ Node is published and ready to view\n";
  
  // Display component summary
  if (!empty($components)) {
    echo "\nCreated Components:\n";
    $component_types = array_column($components, 'type');
    $component_counts = array_count_values($component_types);
    foreach ($component_counts as $type => $count) {
      echo "- $type: $count\n";
    }
  }
  
  echo "\n=== NEXT STEPS ===\n";
  echo "1. Visit the page at: $base_url/node/" . $node->id() . "\n";
  echo "2. Edit the page at: $base_url/node/" . $node->id() . "/edit\n";
  echo "3. Customize the content and styling as needed\n\n";
  
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
  exit(1);
}