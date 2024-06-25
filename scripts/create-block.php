<?php

/**
 * @file
 * DrupalAI custom command.
 */

use Drupal\drupalai\DrupalAiFactory;

const PROMPT = <<<EOT
  You are an experienced Drupal 10 developer tasked with creating the Drupal configuration
  for a new block type as well as paragraph types when applicable.
  Consider Drupal best practices as you develop this test suite.

  Current configuration:
  DRUPAL_TYPES

  Create configuration files for every configuration file required to create the new block type.
  Ensure that the configuration adheres to the provided instructions.

  CONFIG_INSTRUCTIONS

  Before proceeding, ensure adherence to Drpal 10 coding standards and best practices.

  Important Guidelines:

  Your task is to provide a response in XML format, adhering to the example structure provided below.
  Ensure proper syntax and closure of all XML tags. Do not add any extra indentation to the XML response.
  Provide

  Example Structure:
  <files>
  <file>
  <filename>block_content.type.hero.yml</filename>
  <content>
  uuid: 9393410c-155f-4912-b842-d60667df90e7
  langcode: en
  status: true
  dependencies: {  }
  _core:
    default_config_hash: AXvthsnSuD8ma1V0ShmQdZEWLp1UuRHZaeb5rmfB5Bo
  id: hero
  label: Hero
  revision: 0
  description: 'The Hero Component is designed for promotional teasers that include a large, impactful image, typically placed at the top of a page. This component is perfect for highlighting key messages, announcements, or featured content in a visually engaging way.'
  </content>
  </file>
  </files>
  EOT;

$drupal_config_types = file_get_contents('../scripts/drupal-config.csv');

$prompt = str_replace('DRUPAL_TYPES', $drupal_config_types, PROMPT);
$prompt = str_replace('CONFIG_INSTRUCTIONS', 'Create a Hero Overlay component that is full-width with text, link that overlays a media image.', $prompt);

print "Querying AI ..." . PHP_EOL;

$ai_model = DrupalAiFactory::build('gemini');

$contents = $ai_model->getChat($prompt);

$xml = @simplexml_load_string($contents);

if (!empty($xml)) {
  foreach ($xml->file as $file) {
    $filename = (string) $file->filename;
    $content = (string) $file->content;

    print "Creating file: {$filename} ..." . PHP_EOL;

    $file_path = '../config/sync/' . $filename;
    file_put_contents($file_path, trim($content));
  }
}
