<?php

/**
 * @file
 * DrupalAI custom command.
 */

use Drupal\drupalai\Commands\DrupalAiChat;

// 'gpt-4o' => 'ChatGPT-4o'.
// 'gpt-3.5-turbo-0125' => 'ChatGPT 3.5 Turbo'.
// 'gemini-1.5-flash' => 'Gemini 1.5 Flash'.
// 'gemini-1.5-pro' => 'Gemini 1.5 Pro'.
// 'claude-3-haiku-20240307' => 'Claude 3 Haiku'.
// 'claude-3-opus-20240229' => 'Claude 3 Opus'.
// 'claude-3-sonnet-20240229' => 'Claude 3.5 Sonnet'.
// 'llama3-70b-8192' => 'Llama3 70b 8192 (Groq)'.

// Model name.
$model_name = 'claude-3-haiku-20240307';

// Create a new chat instance.
$ai_chat = new DrupalAiChat($model_name);

$directory = 'themes/contrib/drupalx_theme/components';

// Get all the component directories.
$component_directories = array_diff(scandir($directory), ['.', '..']);

// Loop through the component directories.
foreach ($component_directories as $component) {
  // If destination directory exists, skip.
  if (is_dir('themes/contrib/drupalx_theme/react-components/' . $component)) {
    continue;
  }

  $ai_chat = new DrupalAiChat($model_name);

  // Import all component to serve.
  $response = $ai_chat->importFiles($directory . '/' . $component, ['.css']);

  if ($response) {
    // Display the response.
    $ai_chat->processAndDisplayResponse($response);

    // Create new Next.js components using the DrupalX theme components.
    $prompt = 'Using the ' . $component . ' component, create a new Storybook
      React component with the same name at the path
      themes/contrib/drupalx_theme/react-components/' . $component . '/. The
      new component should:
      1. Use the create_files tool.
      2. Match the structure of the existing DrupalX theme component.
      3. Include a .tsx file instead of a .twig file.
      4. Include a .stories.tsx file for Storybook integration.
      5. Include a .scss file if the original component has a .css file.
      6. Be written entirely in React syntax.
      7. Maintain the design and layout of the DrupalX theme component.
      8. Be intended for integration with Next.js.';

    // Generate the components.
    [$response] = $ai_chat->chatWithModel($prompt);

    // Display the response.
    if ($response) {
      $ai_chat->processAndDisplayResponse($response);
    }
  }
}
