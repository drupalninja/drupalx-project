describe('Get Started Page', () => {
  beforeEach(() => {
    cy.visit('/get-started');
  });

  it('should display the Get Started page title', () => {
    cy.get('h1').should('contain.text', 'Get Started');
  });

  it('should display all expected components', () => {
    const components = [
      { selector: '.block-content--type-hero', name: 'Hero' },
      { selector: '.block-content--type-sidebyside', name: 'Side-by-side' }
    ];
    components.forEach(({ selector, name }) => {
      cy.get(selector).should('be.visible').and('exist');
    });
  });
});
