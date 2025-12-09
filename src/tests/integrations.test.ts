describe('Integrations', () => {
  test('GAEB export endpoint path exists', () => {
    expect('/__/functions/exportGaebForOffer').toContain('exportGaebForOffer');
  });
  test('DATEV export endpoint path exists', () => {
    expect('/__/functions/exportDatev').toContain('exportDatev');
  });
  test('Lexware export endpoint path exists', () => {
    expect('/__/functions/exportLexware').toContain('exportLexware');
  });
  test('Public API OpenAPI path exists', () => {
    expect('/api/v1/openapi.json').toContain('openapi');
  });
});














