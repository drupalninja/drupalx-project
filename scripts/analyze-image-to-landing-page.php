<?php

/**
 * @file
 * Drush script to analyze images and convert them to landing page JSON structures.
 *
 * Usage: drush scr scripts/analyze-image-to-landing-page.php /path/to/image.png
 */

use Drupal\Core\File\FileSystemInterface;
use Drupal\file\Entity\File;
use Drupal\ai\AiProviderPluginManager;
use Drupal\ai\OperationType\Chat\ChatInput;
use Drupal\ai\OperationType\Chat\ChatMessage;

// For testing, use the Allegheny County image - use relative path from Drupal root
$image_path = 'scripts/www_alleghenycounty_us.png';
$output_file = null;

echo "Testing image analysis with: $image_path\n";

// Convert to absolute path for file operations
$absolute_path = DRUPAL_ROOT . '/../' . $image_path;

// Validate image file exists
if (!file_exists($absolute_path)) {
  echo "Error: Image file not found: $absolute_path\n";
  echo "Working directory: " . getcwd() . "\n";
  echo "DRUPAL_ROOT: " . DRUPAL_ROOT . "\n";
  exit(1);
}

// Use absolute path for all operations
$image_path = realpath($absolute_path);

echo "Analyzing image: $image_path\n";

// Initialize Drupal services
$ai_provider_manager = \Drupal::service('ai.provider');
$file_system = \Drupal::service('file_system');
$config = \Drupal::config('drupalx_ai.settings');

/**
 * Load available paragraph types from drupalx_ai sample components
 */
function loadSampleComponents() {
  $module_path = \Drupal::service('extension.list.module')->getPath('drupalx_ai');
  $sample_file = $module_path . '/files/sample-components.json';
  
  if (!file_exists($sample_file)) {
    throw new Exception("Sample components file not found: $sample_file");
  }
  
  $sample_content = file_get_contents($sample_file);
  $sample_data = json_decode($sample_content, TRUE);
  
  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception("Invalid sample components JSON: " . json_last_error_msg());
  }
  
  return $sample_data;
}

/**
 * Create comprehensive system prompt for image analysis
 */
function createImageAnalysisPrompt() {
  $sample_components = loadSampleComponents();

  $prompt = "You are an expert web designer and content strategist analyzing website screenshots to create landing page structures.\n\n";

  $prompt .= "AVAILABLE PARAGRAPH COMPONENTS AND THEIR STRUCTURE:\n";
  $prompt .= "Use these exact component types and field structures from the drupalx_ai system:\n\n";
  
  // Show actual sample structure for each component type
  foreach ($sample_components as $component) {
    if (isset($component['type'])) {
      $prompt .= "## " . strtoupper($component['type']) . " Component:\n";
      $prompt .= "```json\n";
      $prompt .= json_encode($component, JSON_PRETTY_PRINT) . "\n";
      $prompt .= "```\n\n";
    }
  }

  $prompt .= "ANALYSIS TASK:\n";
  $prompt .= "Analyze the provided website screenshot and create a JSON structure that maps each visual component to the most appropriate paragraph type. ";
  $prompt .= "Extract actual text content where visible and readable, and create realistic placeholder content where text is not clearly visible.\n\n";

  $prompt .= "REQUIREMENTS:\n";
  $prompt .= "1. Map EVERY distinct visual section/component in the image\n";
  $prompt .= "2. Use actual text content from the image when clearly readable\n";
  $prompt .= "3. Choose the most appropriate paragraph type for each component\n";
  $prompt .= "4. Maintain visual hierarchy and layout structure\n";
  $prompt .= "5. Create realistic, relevant content for any placeholder text needed\n";
  $prompt .= "6. Include proper alt text for any images/media references (omit src URLs)\n";
  $prompt .= "7. Use plain text only for card summaries (no HTML formatting)\n";
  $prompt .= "8. Order components from top to bottom as they appear on the page\n\n";

  $prompt .= "OUTPUT FORMAT:\n";
  $prompt .= "Return a JSON object with this structure:\n";
  $prompt .= "{\n";
  $prompt .= "  \"page_title\": \"Extracted or inferred page title\",\n";
  $prompt .= "  \"page_summary\": \"Brief description of the page purpose\",\n";
  $prompt .= "  \"components\": [\n";
  $prompt .= "    {\n";
  $prompt .= "      \"type\": \"paragraph_type_name\",\n";
  $prompt .= "      \"weight\": 0,\n";
  $prompt .= "      \"fields\": {\n";
  $prompt .= "        \"field_name\": \"field_value\",\n";
  $prompt .= "        \"media\": {\"alt\": \"description\"}, // omit src URLs\n";
  $prompt .= "        \"nested_items\": [...] // for components with child items\n";
  $prompt .= "      }\n";
  $prompt .= "    }\n";
  $prompt .= "  ]\n";
  $prompt .= "}\n\n";

  $prompt .= "Analyze the image carefully and provide a comprehensive JSON structure that could be used to recreate the page layout using the available paragraph components.";

  return $prompt;
}

/**
 * Configure AI provider using drupalx_ai configuration
 */
function configureAiProvider() {
  $config = \Drupal::config('drupalx_ai.settings');
  $ai_provider_model = $config->get('ai_provider_model');

  if (empty($ai_provider_model)) {
    echo "No AI provider configured in drupalx_ai.settings\n";
    echo "Using default Groq provider...\n";
    $provider_id = 'groq';
    $model_id = 'llama-3.3-70b-versatile';
  } else {
    [$provider_id, $model_id] = explode(':', $ai_provider_model, 2);

    // Handle the "default" model reference by getting the actual default model
    if ($model_id === 'default') {
      $ai_config = \Drupal::config('ai.settings');
      $actual_model = $ai_config->get('default_chat_model');
      if (!empty($actual_model)) {
        $model_id = $actual_model;
        echo "Resolved 'default' model to: $model_id\n";
      } else {
        // Fallback to known working model
        $model_id = 'llama-3.3-70b-versatile';
        echo "Using fallback model: $model_id\n";
      }
    }
  }

  echo "Using provider: $provider_id, model: $model_id\n";

  try {
    $ai_provider_manager = \Drupal::service('ai.provider');
    $provider = $ai_provider_manager->createInstance($provider_id);

    return ['provider' => $provider, 'provider_id' => $provider_id, 'model_id' => $model_id];

  } catch (Exception $e) {
    echo "Error configuring AI provider: " . $e->getMessage() . "\n";
    exit(1);
  }
}

/**
 * Convert image to base64 for API
 */
function encodeImageToBase64($image_path) {
  $image_data = file_get_contents($image_path);
  if ($image_data === false) {
    throw new Exception("Cannot read image file: $image_path");
  }

  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime_type = finfo_file($finfo, $image_path);
  finfo_close($finfo);

  if (!in_array($mime_type, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
    throw new Exception("Unsupported image type: $mime_type");
  }

  $base64 = base64_encode($image_data);
  return "data:$mime_type;base64,$base64";
}

/**
 * Validate and clean JSON response
 */
function validateAndCleanResponse($response) {
  // Try to extract JSON from response
  $json_start = strpos($response, '{');
  $json_end = strrpos($response, '}') + 1;

  if ($json_start === false || $json_end === false) {
    throw new Exception("No JSON found in response");
  }

  $json_str = substr($response, $json_start, $json_end - $json_start);
  $data = json_decode($json_str, true);

  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception("Invalid JSON: " . json_last_error_msg());
  }

  // Validate required structure
  if (!isset($data['components']) || !is_array($data['components'])) {
    throw new Exception("Invalid response structure: missing components array");
  }

  return $data;
}

// Main execution
try {
  echo "Step 1: Configuring AI provider...\n";
  $ai_config = configureAiProvider();
  $provider = $ai_config['provider'];
  $model_id = $ai_config['model_id'];

  // Check if we can use a vision model
  $vision_models = ['meta-llama/llama-4-scout-17b-16e-instruct', 'llava-v1.5-7b-4096-preview'];
  if (in_array($model_id, $vision_models)) {
    echo "Using vision-capable model: $model_id\n";
    $supports_vision = true;
  } else {
    echo "Using text-only model: $model_id\n";
    $supports_vision = false;
  }

  echo "Step 2: Encoding image...\n";
  $base64_image = encodeImageToBase64($image_path);

  echo "Step 3: Creating analysis prompt...\n";
  $prompt = createImageAnalysisPrompt();

  echo "Step 4: Sending to AI for analysis...\n";

  if ($supports_vision) {
    echo "Using vision-enabled analysis...\n";
    // For vision models, include the image in the message
    $user_message = $prompt . "\n\n[Image: " . $base64_image . "]";
  } else {
    echo "Using text-only analysis...\n";
    // For text-only models, just use the prompt without specific content references
    $user_message = $prompt . "\n\nNote: Analyze the website content to create appropriate landing page components using the available paragraph types.";
  }

  // Create the chat input using drupalx_ai pattern
  $messages = new ChatInput([
    new ChatMessage('user', $user_message),
  ]);

  $response = $provider->chat($messages, $model_id);
  $ai_content = $response->getNormalized()->getText();

  if (empty($ai_content)) {
    throw new Exception("Empty response from AI provider");
  }

  echo "Step 5: Processing response...\n";
  $analysis_result = validateAndCleanResponse($ai_content);

  // Add metadata
  $analysis_result['metadata'] = [
    'source_image' => $image_path,
    'analysis_date' => date('c'),
    'ai_model' => $model_id,
    'drupalx_ai_version' => '1.0',
    'vision_supported' => $supports_vision
  ];

  echo "Step 6: Saving results...\n";

  // Determine output file
  if ($output_file) {
    $output_path = $output_file;
  } else {
    $image_name = pathinfo($image_path, PATHINFO_FILENAME);
    $output_path = dirname($image_path) . '/' . $image_name . '_landing_page.json';
  }

  // Write JSON output
  $json_output = json_encode($analysis_result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  file_put_contents($output_path, $json_output);

  echo "\n=== ANALYSIS COMPLETE ===\n";
  echo "Output saved to: $output_path\n\n";

  // Display summary
  echo "=== SUMMARY ===\n";
  echo "Page Title: " . ($analysis_result['page_title'] ?? 'Not detected') . "\n";
  echo "Components Found: " . count($analysis_result['components']) . "\n";

  if (!empty($analysis_result['components'])) {
    echo "\nComponent Types:\n";
    $component_counts = array_count_values(array_column($analysis_result['components'], 'type'));
    foreach ($component_counts as $type => $count) {
      echo "- $type: $count\n";
    }
  }

  echo "\n=== NEXT STEPS ===\n";
  echo "1. Review the generated JSON structure in: $output_path\n";
  echo "2. Use this JSON with drupalx_ai to create a landing page:\n";
  echo "   drush drupalx_ai:import-landing-page $output_path\n";
  echo "3. Or integrate with the drupalx_ai chatbot/API for automated creation\n\n";

} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
  exit(1);
}
