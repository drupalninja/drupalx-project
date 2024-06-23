describe('demo homepage loads', () => {
  it('passes', () => {
    cy.visit('/')
  })
})

describe('kitchen sink page loads', () => {
  it('passes', () => {
    cy.visit('/kitchen-sink')
  })
})

describe('features page loads', () => {
  it('passes', () => {
    cy.visit('/features')
  })
})

describe('articles page loads', () => {
  it('passes', () => {
    cy.visit('/articles')
  })
})

describe('get started page loads', () => {
  it('passes', () => {
    cy.visit('/get-started')
  })
})

describe('contact page loads', () => {
  it('passes', () => {
    cy.visit('/contact')
  })
})

describe('privacy page loads', () => {
  it('passes', () => {
    cy.visit('/privacy')
  })
})

describe('terms of use page loads', () => {
  it('passes', () => {
    cy.visit('/terms-of-use')
  })
})

describe('specific article page loads', () => {
  it('passes', () => {
    cy.visit('/article/article-title-1')
  })
})
