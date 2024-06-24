describe('Privacy Page', () => {
  beforeEach(() => {
    cy.visit('/privacy');
  });

  it('should display the Privacy Policy page title', () => {
    cy.get('h1').should('contain.text', 'Privacy Policy');
  });

  it('should display the expected components', () => {
    const components = [
      { selector: '.node--type-page', name: 'Page Content' }
    ];
    components.forEach(({ selector, name }) => {
      cy.get(selector).should('be.visible').and('exist');
    });
  });
});
