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

// Create paragraph definitions for every block that exists.
$prompt = 'Convert the following block definitions to paragraph definitions (located in profiles/custom/config/install:
  core.entity_form_display.block_content.accordion.default.yml
  core.entity_form_display.block_content.card_group.default.yml
  core.entity_form_display.block_content.carousel.default.yml
  core.entity_form_display.block_content.embed.default.yml
  core.entity_form_display.block_content.form.default.yml
  core.entity_form_display.block_content.gallery.default.yml
  core.entity_form_display.block_content.hero.default.yml
  core.entity_form_display.block_content.library.default.yml
  core.entity_form_display.block_content.media.default.yml
  core.entity_form_display.block_content.newsletter.default.yml
  core.entity_form_display.block_content.quote.default.yml
  core.entity_form_display.block_content.sidebyside.default.yml
  core.entity_form_display.block_content.text.default.yml
  core.entity_form_display.block_content.views.default.yml
  core.entity_view_display.block_content.accordion.default.yml
  core.entity_view_display.block_content.card_group.default.yml
  core.entity_view_display.block_content.carousel.default.yml
  core.entity_view_display.block_content.embed.default.yml
  core.entity_view_display.block_content.form.default.yml
  core.entity_view_display.block_content.gallery.default.yml
  core.entity_view_display.block_content.hero.default.yml
  core.entity_view_display.block_content.library.default.yml
  core.entity_view_display.block_content.media.default.yml
  core.entity_view_display.block_content.newsletter.default.yml
  core.entity_view_display.block_content.quote.default.yml
  core.entity_view_display.block_content.sidebyside.default.yml
  core.entity_view_display.block_content.text.default.yml
  core.entity_view_display.block_content.views.default.yml
  field.field.block_content.accordion.field_accordion_item.yml
  field.field.block_content.accordion.field_title.yml
  field.field.block_content.card_group.field_card.yml
  field.field.block_content.card_group.field_title.yml
  field.field.block_content.carousel.field_carousel_item.yml
  field.field.block_content.embed.field_script.yml
  field.field.block_content.embed.field_title.yml
  field.field.block_content.form.field_title.yml
  field.field.block_content.form.field_webform.yml
  field.field.block_content.gallery.body.yml
  field.field.block_content.gallery.field_media_item.yml
  field.field.block_content.gallery.field_title.yml
  field.field.block_content.hero.field_heading.yml
  field.field.block_content.hero.field_hero_layout.yml
  field.field.block_content.hero.field_link.yml
  field.field.block_content.hero.field_media.yml
  field.field.block_content.hero.field_summary.yml
  field.field.block_content.library.field_block.yml
  field.field.block_content.media.field_media.yml
  field.field.block_content.media.field_title.yml
  field.field.block_content.quote.field_author.yml
  field.field.block_content.quote.field_job_title.yml
  field.field.block_content.quote.field_logo.yml
  field.field.block_content.quote.field_quote.yml
  field.field.block_content.quote.field_thumb.yml
  field.field.block_content.sidebyside.field_eyebrow.yml
  field.field.block_content.sidebyside.field_link.yml
  field.field.block_content.sidebyside.field_media.yml
  field.field.block_content.sidebyside.field_sidebyside_layout.yml
  field.field.block_content.sidebyside.field_summary.yml
  field.field.block_content.sidebyside.field_title.yml
  field.field.block_content.text.body.yml
  field.field.block_content.text.field_link.yml
  field.field.block_content.text.field_title.yml
  field.field.block_content.views.field_link.yml
  field.field.block_content.views.field_title.yml
  field.field.block_content.views.field_views_ref.yml
  field.storage.block_content.field_accordion_item.yml
  field.storage.block_content.field_author.yml
  field.storage.block_content.field_block.yml
  field.storage.block_content.field_card.yml
  field.storage.block_content.field_carousel_item.yml
  field.storage.block_content.field_eyebrow.yml
  field.storage.block_content.field_heading.yml
  field.storage.block_content.field_hero_layout.yml
  field.storage.block_content.field_job_title.yml
  field.storage.block_content.field_link.yml
  field.storage.block_content.field_logo.yml
  field.storage.block_content.field_media_item.yml
  field.storage.block_content.field_media.yml
  field.storage.block_content.field_quote.yml
  field.storage.block_content.field_script.yml
  field.storage.block_content.field_sidebyside_layout.yml
  field.storage.block_content.field_summary.yml
  field.storage.block_content.field_thumb.yml
  field.storage.block_content.field_title.yml
  field.storage.block_content.field_views_ref.yml
  field.storage.block_content.field_webform.yml
  For each file, change the entity type from block_content to paragraph, ensuring that field names and configurations remain consistent. Save the modified YAML files in the appropriate directory, maintaining the original structure as much as possible.';

// Generate the components.
[$response] = $ai_chat->chatWithModel($prompt);

// Display the response.
if ($response) {
  $ai_chat->processAndDisplayResponse($response);
}

print "\n\n";

// Start the chat.
$ai_chat->chatStart();
