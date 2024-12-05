describe('DrupalX Components Page', () => {
  beforeEach(() => {
    cy.visit('/components');
  });

  describe('Navigation', () => {
    it('should have a working main navigation', () => {
      cy.get('nav').should('be.visible');
      cy.get('nav').find('a').should('have.length.at.least', 4);
    });
  });

  describe('Hero Section', () => {
    it('should display hero section with content', () => {
      cy.get('.hero').should('be.visible');
      cy.get('.hero').find('h1').should('contain', 'Example Layout');
      cy.get('.hero').find('img').should('be.visible');
    });
  });

  describe('Side by Side Sections', () => {
    it('should display side by side sections with content', () => {
      cy.get('.sidebyside-badge').first().should('contain', 'DrupalX Features');
      cy.get('h2').contains('DrupalX Rapid Development').should('be.visible');
      cy.get('h2').contains('DrupalX Content Management').should('be.visible');
    });
  });

  describe('Text Sections', () => {
    it('should display text sections properly', () => {
      cy.get('.text-container').should('exist');
      cy.get('.text-container').find('.text-eyebrow').should('be.visible');
      cy.get('.text-container').find('.text-title').should('be.visible');
    });
  });

  describe('Gallery', () => {
    it('should have functioning gallery with modal', () => {
      cy.get('.grid').find('.aspect-w-16').should('have.length.at.least', 4);

      // Test modal functionality
      cy.get('.aspect-w-16 button').first().click();
      cy.get('.modal').should('be.visible');
    });
  });

  describe('Carousel', () => {
    it('should have functioning carousel controls', () => {
      cy.get('.carousel').should('be.visible');
      cy.get('.carousel-next').should('be.visible').click();
      cy.get('.carousel-prev').should('be.visible').click();
    });
  });

  describe('FAQ Accordion', () => {
    it('should have functioning accordion', () => {
      cy.get('[data-accordion-trigger]').should('have.length.at.least', 1);

      // Test accordion functionality
      cy.get('[data-accordion-trigger]').first().click();
      cy.get('[data-accordion-content]').first()
        .should('have.css', 'overflow', 'hidden');
    });
  });

  describe('Newsletter Section', () => {
    it('should have newsletter signup form', () => {
      cy.get('input[name="newsletter_email"]').should('be.visible');
      cy.get('input[name="newsletter_email"]')
        .should('have.attr', 'placeholder', 'Email Address');
    });
  });

  describe('Card Components', () => {
    it('should display card group properly', () => {
      cy.get('.card').should('have.length.at.least', 3);
    });
  });

  describe('Stat Components', () => {
    it('should display stats group properly', () => {
      cy.get('.stat').should('have.length.at.least', 3);
      cy.get('.stat').first().within(() => {
        cy.get('.stat-icon').should('be.visible');
        cy.get('h3').should('be.visible');
        cy.get('p').should('be.visible');
      });
    });
  });

  describe('Footer', () => {
    it('should have footer with navigation', () => {
      cy.get('footer').should('be.visible');
      cy.get('footer').find('nav').should('exist');
      cy.get('footer').contains('a', 'Privacy Policy').should('be.visible');
    });
  });
});
