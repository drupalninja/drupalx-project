describe('Kitchen Sink Layout Page', () => {
  beforeEach(() => {
    cy.visit('/kitchen-sink');
  });

  it('should display the kitchen sink page with title', () => {
    cy.get('h1').should('contain.text', 'Kitchen Sink Page');
  });

  it('should display all components', () => {
    const components = [
      { selector: '.block-content--type-hero', name: 'Hero' },
      { selector: '.block-content--type-card-group', name: 'Card Group' },
      { selector: '.block-content--type-text', name: 'Text Block' },
      { selector: '.block-content--type-media', name: 'Media Block' },
      { selector: '.block-content--type-gallery', name: 'Gallery' },
      { selector: '.block-content--type-embed', name: 'Embed' },
      { selector: '.block-content--type-carousel', name: 'Carousel' },
      { selector: '.block-content--type-accordion', name: 'Accordion' },
      { selector: '.block-content--type-quote', name: 'Quote' },
      { selector: '.block-content--type-newsletter', name: 'Newsletter Form' },
      { selector: '.block-content--type-sidebyside', name: 'Side-by-side' }
    ];
    components.forEach(({ selector, name }) => {
      cy.get(selector).should('be.visible').and('exist');
    });
  });
});
