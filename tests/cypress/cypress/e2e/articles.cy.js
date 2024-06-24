describe('Articles Page', () => {
  beforeEach(() => {
    cy.visit('/articles');
  });

  it('should display the articles page with title', () => {
    cy.get('h1').should('contain.text', 'Articles');
  });

  it('should display the Articles block', () => {
    cy.get('.view-recent-cards').should('be.visible');
  });
});
