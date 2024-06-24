const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://drupalx-project.ddev.site',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  env: {
    'drushCommand': 'ddev drush'
  },
  video: false
});
