describe('Features Page', () => {
  beforeEach(() => {
    cy.visit('/features');
  });

  it('should display the Features page with title', () => {
    cy.get('h1').should('contain.text', 'Features');
  });

  it('should display all components in the Features page', () => {
    const components = [
      { selector: '.block-content--type-hero', name: 'Hero' },
      { selector: '.block-content--type-sidebyside', name: 'Side-by-side' }
    ];
    components.forEach(({ selector, name }) => {
      cy.get(selector).should('be.visible').and('exist');
    });
  });
});
