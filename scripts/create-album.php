<?php

/**
 * @file
 * DrupalAI custom command.
 */

use Drupal\drupalai\Commands\DrupalAiChat;

// Initiaize variables.
$scrape_url = 'https://getbootstrap.com/docs/5.3/examples/album/';

// Model name.
$model_name = 'claude-3-haiku-20240307';

// Create a new chat instance.
$ai_chat = new DrupalAiChat($model_name);

// Scrape the page we want to follow.
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

    // Create new components using the page and the example component.
    $prompt = 'Using the accordion component as an example, create a
      Bootstrap 5 album component (using create_files tool) with .twig,
      .stories.js (category Editorial), and .scss in the drupalx_theme
      at components/album.';

    // Generate the components.
    [$response] = $ai_chat->chatWithModel($prompt);

    // Display the response.
    $ai_chat->processAndDisplayResponse($response);
  }
}
