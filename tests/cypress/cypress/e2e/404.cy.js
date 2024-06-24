describe('404 Page', () => {
  beforeEach(() => {
    cy.visit('/non-existing-page', { failOnStatusCode: false });
  });

  it('should display the 404 page title', () => {
    cy.get('h1').should('contain.text', 'Oops! Page not found');
  });

  it('should display an appropriate message', () => {
    cy.get('p').should('contain.text', 'We\'re sorry, but the page you requested could not be found.');
  });

  context('Responsive Design', () => {
    const sizes = ['iphone-6', 'ipad-2', 'macbook-15'];
    sizes.forEach((size) => {
      it(`should display correctly on ${size}`, () => {
        cy.viewport(size);
        cy.get('h1').should('be.visible');
        cy.get('p').should('be.visible');
      });
    });
  });
});