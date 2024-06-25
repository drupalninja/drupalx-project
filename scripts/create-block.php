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

  Current configuration (in CSV format):
  DRUPAL_TYPES

  Create configuration files for every configuration file required to create the new block type.
  Important: reuse existing fields and configuration where possible.

  CONFIG_INSTRUCTIONS

  Before proceeding, ensure adherence to Drpal 10 coding standards and best practices.

  Important Guidelines:

  Your task is to provide a response in XML format, adhering to the example structure provided below.
  In the example structure there are two files, but you can have more than two files in your response.
  Block types will typically have a block_content.type.*.yml file and at least one field.field.block_content.*.yml file.
  Block types will also have a core.entity_form_display.block_content.*.default.yml file and a core.entity_view_display.block_content.*.default.yml file.
  Block types will also have a auto_entitylabel.settings.block_content.*.yml file.
  New fields will require a field.storage.block_content.*.yml file (only create if file doesn't exist in current configuration).
  Paragraph types will typically have a paragraph.type.*.yml file and at least one field.field.paragraph.*.yml file.
  Paragraph types will also have a core.entity_form_display.paragraph.*.default.yml and a core.entity_view_display.paragraph.*.default.yml file.
  Ensure proper syntax and closure of all XML tags. Do not add any extra indentation to the XML response.

  Remember to carefully following these instructions and guidelines:
  CONFIG_INSTRUCTIONS

  Example Structure (for a block type, but you can have more than just these files in your response):
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
  <file>
  <filename>field.field.block_content.hero.field_media.yml</filename>
  <content>
  uuid: 7f829ec8-6746-4fe2-889d-ea282f89d782
  langcode: en
  status: true
  dependencies:
    config:
      - block_content.type.hero
      - field.storage.block_content.field_media
      - media.type.image
  _core:
    default_config_hash: jlAaeWGaRBAYu3Z7wuXgrgiO-wf4BC7c0bSyhW0RcUY
  id: block_content.hero.field_media
  field_name: field_media
  entity_type: block_content
  bundle: hero
  label: Media
  description: 'Featured media item for the hero.'
  required: false
  translatable: true
  default_value: {  }
  default_value_callback: ''
  settings:
    handler: 'default:media'
    handler_settings:
      target_bundles:
        image: image
      sort:
        field: _none
        direction: ASC
      auto_create: false
      auto_create_bundle: image
  field_type: entity_reference
  </content>
  </file>
  <file>
  <filename>core.entity_form_display.block_content.hero.default.yml</filename>
  <content>
  uuid: 637460bb-e7ad-473c-bd03-8810ea5268e6
  langcode: en
  status: true
  dependencies:
    config:
      - block_content.type.hero
      - field.field.block_content.hero.field_heading
      - field.field.block_content.hero.field_hero_layout
      - field.field.block_content.hero.field_link
      - field.field.block_content.hero.field_media
      - field.field.block_content.hero.field_summary
    module:
      - link
      - media_library
      - text
  _core:
    default_config_hash: fx57jnCUYpRzC09NpxeSQh7D15J0i4KWQfGo8ftUj_w
  id: block_content.hero.default
  targetEntityType: block_content
  bundle: hero
  mode: default
  content:
    field_heading:
      type: text_textfield
      weight: 2
      region: content
      settings:
        size: 60
        placeholder: ''
      third_party_settings: {  }
    field_hero_layout:
      type: options_select
      weight: 1
      region: content
      settings: {  }
      third_party_settings: {  }
    field_link:
      type: link_default
      weight: 5
      region: content
      settings:
        placeholder_url: ''
        placeholder_title: ''
      third_party_settings: {  }
    field_media:
      type: media_library_widget
      weight: 3
      region: content
      settings:
        media_types: {  }
      third_party_settings: {  }
    field_summary:
      type: text_textarea
      weight: 4
      region: content
      settings:
        rows: 5
        placeholder: ''
      third_party_settings: {  }
    info:
      type: string_textfield
      weight: 0
      region: content
      settings:
        size: 60
        placeholder: ''
      third_party_settings: {  }
  hidden: {  }
  </content>
  </file>
  <file>
  <filename>core.entity_view_display.block_content.hero.default.yml</filename>
  <content>
  uuid: 0f56362b-7f1c-4a61-a473-89f8e7b6da03
  langcode: en
  status: true
  dependencies:
    config:
      - block_content.type.hero
      - field.field.block_content.hero.field_heading
      - field.field.block_content.hero.field_hero_layout
      - field.field.block_content.hero.field_link
      - field.field.block_content.hero.field_media
      - field.field.block_content.hero.field_summary
    module:
      - link
      - options
      - text
  _core:
    default_config_hash: aWeSZbznfjPSQWyGP0dA9l8zFvXHAPgBGHAWKrCdcVk
  id: block_content.hero.default
  targetEntityType: block_content
  bundle: hero
  mode: default
  content:
    field_heading:
      type: text_default
      label: hidden
      settings: {  }
      third_party_settings: {  }
      weight: 4
      region: content
    field_hero_layout:
      type: list_key
      label: above
      settings: {  }
      third_party_settings: {  }
      weight: 5
      region: content
    field_link:
      type: link
      label: hidden
      settings:
        trim_length: 80
        url_only: false
        url_plain: false
        rel: ''
        target: ''
      third_party_settings: {  }
      weight: 1
      region: content
    field_media:
      type: entity_reference_entity_view
      label: hidden
      settings:
        view_mode: hero
        link: false
      third_party_settings: {  }
      weight: 0
      region: content
    field_summary:
      type: text_default
      label: hidden
      settings: {  }
      third_party_settings: {  }
      weight: 3
      region: content
  hidden:
    search_api_excerpt: true

  </content>
  </file>
  <file>
  <filename>auto_entitylabel.settings.block_content.hero.yml</filename>
  <content>
    _core:
    default_config_hash: IPbHC9Ayh-Sfl3OOEbQkKiiMg10oCyxrVBoH26H1X9U
  status: 2
  pattern: 'Hero: [block_content:field_title]'
  escape: false
  preserve_titles: false
  save: false
  chunk: 50
  dependencies:
    config:
      - block_content.type.hero
  </content>
  </file>
  </files>
  EOT;

$drupal_config_types = file_get_contents('../scripts/drupal-config.csv');

$prompt = str_replace('DRUPAL_TYPES', $drupal_config_types, PROMPT);
$prompt = str_replace('CONFIG_INSTRUCTIONS', 'Create a side-by-side compoennt with image, title, body but also bullets with icons', $prompt);

print "Querying AI ..." . PHP_EOL;

// gpt-3.5-turbo-0125.
$ai_model = DrupalAiFactory::build('gpt-3.5-turbo-0125');

$contents = $ai_model->getChat($prompt);

print $contents . PHP_EOL;

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
