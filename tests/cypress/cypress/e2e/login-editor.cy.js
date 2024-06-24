import editor from '../fixtures/users/role-editor.json'
import content from '../fixtures/content/node-basic-page.json'

let editorData = {};

describe('Login as editor and perform actions', { tags: ['@local', '@login-editor'] }, () => {
  before(() => {
    cy.createUserWithRole(editor.username, editor.mail, editor.roles).then((userData) => {
      // Store user data with uid so we can pass that to the session.
      editorData = userData;
    });
  });

  beforeEach(() => {
    // Login as editor user.
    cy.loginWithEmail(editor.mail, editorData.uid);
    cy.visit('/node/add/page')
  });

  it('create basic page', () => {
    // Create the basic page node.
    cy.get('[data-drupal-selector="edit-title-0-value"]').type(content['title'])
    cy.get('[data-drupal-selector="edit-submit"]').first().click();

    // Verify node was created and content appears on a page.
    cy.get('h1').should('contain', content['title'])
  })
});
