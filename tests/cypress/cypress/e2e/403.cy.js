describe('403 Page', () => {
  beforeEach(() => {
    cy.visit('/access-denied');
  });

  it('should display the 403 page with title and message', () => {
    cy.get('h1').should('contain.text', 'Access denied');
    cy.get('p').should('contain.text', "We're sorry, but you do not have permission to access this page. Please contact the site administrator if you believe this is an error, or click the button below to return to the homepage.");
  });

  it('should have a link back to the homepage', () => {
    cy.get('a[href="/"]').should('contain.text', 'Return to homepage');
  });
});
