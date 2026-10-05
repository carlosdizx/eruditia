import escapeHtml from '@email/utils/escape-html.util';

describe('escapeHtml', () => {
  it.each([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
  ])('escapes "%s" as "%s"', (char, entity) => {
    expect(escapeHtml(char)).toBe(entity);
  });

  it('escapes every special character in a string', () => {
    expect(escapeHtml('<script>alert("x & y")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x &amp; y&quot;)&lt;/script&gt;',
    );
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Ana López')).toBe('Ana López');
  });

  it('returns an empty string for an empty input', () => {
    expect(escapeHtml('')).toBe('');
  });
});
