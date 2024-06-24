describe('Verify the user login page', () => {
  beforeEach(() => cy.visit('/user'))

  it('login page loads', () => {
    cy.title().should('contains', 'Log in')
  })

  it('login page redirected to /user/login', () => {
    cy.url().should('include', '/user/login')
  })

  it('login form exists', () => {
    cy.get('[data-drupal-selector="user-login-form"]').contains('Username')
    cy.get('[data-drupal-selector="user-login-form"]').contains('Password')
    cy.get('[data-drupal-selector="edit-submit"]').contains('Log in')
  })
})
