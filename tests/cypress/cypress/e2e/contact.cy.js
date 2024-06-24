describe('Contact Page', () => {
  beforeEach(() => {
    cy.visit('/contact');
  });

  it('should display the Contact Us page title', () => {
    cy.get('h1').should('contain.text', 'Contact Us');
  });

  it('should display all expected components', () => {
    const components = [
      { selector: '.block-content--type-hero', name: 'Hero' },
      { selector: '.block-content--type-form', name: 'Form' }
    ];
    components.forEach(({ selector, name }) => {
      cy.get(selector).should('be.visible').and('exist');
    });
  });
});
