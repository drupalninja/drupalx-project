<?php

/**
 * @file
 * DrupalAI custom command to generate tests.
 */

use Drupal\drupalai\DrupalAiFactory;

const CYPRESS_PROMPT = <<<EOT
  You are an experienced Drupal 10 developer tasked with creating a Cypress.js test suite for a
  component in the DrupalX theme. Consider Drupal best practices as you develop this test suite.

  Files to refactor:
  COMPONENT_FILES
  COMPONENT_INSTRUCTIONS

  Before proceeding, ensure adherence to Cypress.js coding standards and best practices.
  Any issues encountered during development should be reported as Drupal messages.

  Important Guidelines:

  The Cypress test should check for the presence and proper rendering of specific theme components.
  Include tests for responsive design, verifying the correct display on various screen sizes.

  Your task is to provide a response in XML format, adhering to the example structure provided below.
  Ensure proper syntax and closure of all XML tags. Do not add any extra indentation to the XML response.

  Example Structure:
  <files>
  <file>
  <filename>accordion.cy.js</filename>
  <content>
  describe('Accordion Component', () => {
    beforeEach(() => {
      cy.visit('/path-to-your-storybook'); // Update this to your actual Storybook URL
    });

    it('should display all accordion items', () => {
      cy.get('.accordion-item').should('have.length', 3);
    });

    it('should have collapsed accordion items initially', () => {
      cy.get('.accordion-button').each((\$button) => {
        cy.wrap(\$button).should('have.class', 'collapsed');
      });

      cy.get('.accordion-collapse').each((\$collapse) => {
        cy.wrap(\$collapse).should('not.have.class', 'show');
      });
    });

    it('should expand and collapse an accordion item when clicked', () => {
      cy.get('.accordion-button').first().click();
      cy.get('.accordion-collapse').first().should('have.class', 'show');
      cy.get('.accordion-button').first().should('not.have.class', 'collapsed');

      cy.get('.accordion-button').first().click();
      cy.get('.accordion-collapse').first().should('not.have.class', 'show');
      cy.get('.accordion-button').first().should('have.class', 'collapsed');
    });

    it('should allow multiple accordion items to be expanded simultaneously', () => {
      cy.get('.accordion-button').each((\$button, index) => {
        cy.wrap(\$button).click();
        cy.get('.accordion-collapse').eq(index).should('have.class', 'show');
      });
    });
  });
  </content>
  </file>
  </files>
  EOT;

$editorial_path = './themes/contrib/drupalx_theme/src/stories/components/01 - editorial';

$components = scandir($editorial_path);

foreach ($components as $component_name) {
  // Skip . and .. directories.
  if ($component_name == '.' || $component_name == '..') {
    continue;
  }

  $path = $editorial_path . '/' . $component_name;

  if (!is_dir($path)) {
    continue;
  }

  $files = scandir($path);
  $results = [];

  foreach ($files as $file) {
    // Skip . and .. directories.
    if ($file == '.' || $file == '..' || is_dir($path . '/' . $file)) {
      continue;
    }

    // Get the file contents.
    $contents = file_get_contents($path . '/' . $file);
    $results[$file] = $contents;
  }

  // If no results print error and quit.
  if (empty($results)) {
    print "No files found in the directory for component: {$component_name}" . PHP_EOL;
    continue;
  }

  $component_files = '';

  foreach ($results as $file => $contents) {
    $component_files .= "File: {$file}\nContent: {$contents}\n\n";
  }

  print "Querying AI for component: {$component_name} ..." . PHP_EOL;

  $ai_model = DrupalAiFactory::build('openai');

  $prompt = str_replace('COMPONENT_FILES', $component_files, CYPRESS_PROMPT);
  $prompt = str_replace('COMPONENT_INSTRUCTIONS', 'Write a cypress test for this component.', $prompt);

  $contents = $ai_model->getChat($prompt);

  $xml = @simplexml_load_string($contents);

  if (!empty($xml)) {
    $file = $xml->file;

    $filename = (string) $file->filename;
    $content = (string) $file->content;

    print "Creating Cypress file: {$filename} for component: {$component_name}" . PHP_EOL;

    $file_path = $path . '/' . $filename;
    file_put_contents($file_path, trim($content));
  }
}
