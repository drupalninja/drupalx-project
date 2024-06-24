describe('Terms of Use Page', () => {
  beforeEach(() => {
    cy.visit('/terms-of-use');
  });

  it('should display the Terms of Use page title', () => {
    cy.get('h1').should('contain.text', 'Terms of Use');
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
