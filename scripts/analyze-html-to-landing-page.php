<?php

/**
 * @file
 * Drush script to analyze HTML and convert it to landing page JSON structures.
 *
 * Usage: drush scr scripts/analyze-html-to-landing-page.php
 */

use Drupal\ai\OperationType\Chat\ChatInput;
use Drupal\ai\OperationType\Chat\ChatMessage;

// For testing, use the LA County HTML file
$html_file = 'scripts/lacounty_gov_2025-07-19T13-33-15-685Z.html';

// Convert to absolute path for file operations
$absolute_path = DRUPAL_ROOT . '/../' . $html_file;

echo "Analyzing HTML file: $html_file\n";

// Validate HTML file exists
if (!file_exists($absolute_path)) {
  echo "Error: HTML file not found: $absolute_path\n";
  echo "Working directory: " . getcwd() . "\n";
  echo "DRUPAL_ROOT: " . DRUPAL_ROOT . "\n";
  exit(1);
}

// Use absolute path for file operations
$html_file = realpath($absolute_path);

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
 * Create comprehensive system prompt for HTML analysis
 */
function createHtmlAnalysisPrompt() {
  $sample_components = loadSampleComponents();

  $prompt = "You are an expert web developer and content strategist analyzing HTML code to create landing page structures.\n\n";

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
  $prompt .= "Analyze the provided HTML code and create a JSON structure that maps each semantic section to the most appropriate paragraph type. ";
  $prompt .= "Extract actual text content, headings, links, and structural information from the HTML.\n\n";

  $prompt .= "REQUIREMENTS:\n";
  $prompt .= "1. Parse the HTML and identify distinct content sections\n";
  $prompt .= "2. Extract actual text content, headings, and links from the HTML\n";
  $prompt .= "3. Map each section to the most appropriate paragraph type\n";
  $prompt .= "4. Maintain the visual/semantic hierarchy from the HTML structure\n";
  $prompt .= "5. Convert HTML links to internal Drupal paths where possible\n";
  $prompt .= "6. Include proper alt text for any images/media references (omit src URLs)\n";
  $prompt .= "7. Use plain text only for card summaries (no HTML formatting)\n";
  $prompt .= "8. Group related items (like service links) into appropriate card_group components\n";
  $prompt .= "9. Order components logically based on HTML document flow\n\n";

  $prompt .= "HTML PARSING GUIDELINES:\n";
  $prompt .= "- Look for semantic sections like headers, navigation, main content areas\n";
  $prompt .= "- Identify grouped content that should become card_group components\n";
  $prompt .= "- Extract link text and href attributes for proper link mapping\n";
  $prompt .= "- Use heading tags (h1, h2, etc.) to determine component titles\n";
  $prompt .= "- Convert lists of similar items into card groups or accordion items\n";
  $prompt .= "- Look for slideshow/carousel content and convert to carousel components\n";
  $prompt .= "- Pay attention to slide content and promotional announcements\n";
  $prompt .= "- Extract promotional content and feature announcements\n\n";

  $prompt .= "OUTPUT FORMAT:\n";
  $prompt .= "Return a JSON object with this structure:\n";
  $prompt .= "{\n";
  $prompt .= "  \"page_title\": \"Extracted from title tag or main heading\",\n";
  $prompt .= "  \"page_summary\": \"Brief description from meta description or inferred\",\n";
  $prompt .= "  \"components\": [\n";
  $prompt .= "    {\n";
  $prompt .= "      \"type\": \"paragraph_type_name\",\n";
  $prompt .= "      \"weight\": 0,\n";
  $prompt .= "      \"fields\": {\n";
  $prompt .= "        \"field_name\": \"field_value\",\n";
  $prompt .= "        \"media\": {\"alt\": \"description\"}, // omit src URLs\n";
  $prompt .= "        \"link\": \"/internal-path\", // convert external URLs to internal paths\n";
  $prompt .= "        \"nested_items\": [...] // for components with child items\n";
  $prompt .= "      }\n";
  $prompt .= "    }\n";
  $prompt .= "  ]\n";
  $prompt .= "}\n\n";

  $prompt .= "Analyze the HTML carefully and provide a comprehensive JSON structure that recreates the page content using the available paragraph components.";

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

    // Handle the "default" model reference
    if ($model_id === 'default') {
      $ai_config = \Drupal::config('ai.settings');
      $actual_model = $ai_config->get('default_chat_model');
      if (!empty($actual_model)) {
        $model_id = $actual_model;
        echo "Resolved 'default' model to: $model_id\n";
      } else {
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
 * Clean and prepare HTML for analysis
 */
function cleanHtmlForAnalysis($html_content) {
  // Remove script and style tags
  $html_content = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi', '', $html_content);
  $html_content = preg_replace('/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/mi', '', $html_content);

  // Remove HTML comments
  $html_content = preg_replace('/<!--.*?-->/s', '', $html_content);

  // Remove excessive whitespace
  $html_content = preg_replace('/\s+/', ' ', $html_content);
  $html_content = trim($html_content);

  // Limit content size for AI processing (keep first 25000 characters)
  if (strlen($html_content) > 25000) {
    $html_content = substr($html_content, 0, 25000) . '...';
    echo "Note: HTML content truncated to 25000 characters for analysis\n";
  }

  return $html_content;
}

/**
 * Validate and clean JSON response
 */
function validateAndCleanResponse($response) {
  // Try to extract JSON from response
  $json_start = strpos($response, '{');
  $json_end = strrpos($response, '}') + 1;

  if ($json_start === FALSE || $json_end === FALSE) {
    throw new Exception("No JSON found in response");
  }

  $json_str = substr($response, $json_start, $json_end - $json_start);
  $data = json_decode($json_str, TRUE);

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

  echo "Step 2: Loading and cleaning HTML...\n";
  $html_content = file_get_contents($html_file);
  if ($html_content === FALSE) {
    throw new Exception("Cannot read HTML file: $html_file");
  }

  $cleaned_html = cleanHtmlForAnalysis($html_content);
  echo "HTML content loaded and cleaned (" . strlen($cleaned_html) . " characters)\n";

  echo "Step 3: Creating analysis prompt...\n";
  $prompt = createHtmlAnalysisPrompt();

  echo "Step 4: Sending to AI for analysis...\n";

  $user_message = $prompt . "\n\nHTML TO ANALYZE:\n" . $cleaned_html;

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
    'source_html' => $html_file,
    'analysis_date' => date('c'),
    'ai_model' => $model_id,
    'drupalx_ai_version' => '1.0',
    'analysis_type' => 'html_parsing'
  ];

  echo "Step 6: Saving results...\n";

  // Determine output file
  $html_name = pathinfo($html_file, PATHINFO_FILENAME);
  $output_path = dirname($html_file) . '/' . $html_name . '_landing_page.json';

  // Write JSON output
  $json_output = json_encode($analysis_result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  file_put_contents($output_path, $json_output);

  echo "\n=== HTML ANALYSIS COMPLETE ===\n";
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
  echo "2. Use this JSON with the landing page creator:\n";
  echo "   ddev drush scr scripts/create-landing-page-from-json.php\n";
  echo "3. Customize the generated content as needed\n\n";

} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
  exit(1);
}
