<?php

/**
 * @file
 * DrupalAI custom command.
 */

use Drupal\drupalai\Commands\DrupalAiChat;

// Initiaize variables.
$scrape_url = 'https://biznus-template.webflow.io/';
$model_name = 'gemini-1.5-flash';

// Create a new chat instance.
$ai_chat = new DrupalAiChat($model_name);

// Scrape the design we want to follow.
$response = $ai_chat->scrapeUrl($scrape_url);

// If the response is successful.
if ($response) {
  // Display the response.
  $ai_chat->processAndDisplayResponse($response);

  // Import the accordion component to serve as an example.
  $response = $ai_chat->importFiles('themes/contrib/drupalx_theme/components/accordion');

  if ($response) {
    // Display the response.
    $ai_chat->processAndDisplayResponse($response);

    // Create new components using the design and the example component.
    $prompt = 'Using the accordion component as an example, create a full list of components (using create_files tool) based on the Biznus template, design in the drupalx_theme.';

    // Generate the components.
    [$response] = $ai_chat->chatWithModel($prompt);

    // Display the response.
    $ai_chat->processAndDisplayResponse($response);
  }
}
