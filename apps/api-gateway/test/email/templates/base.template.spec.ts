import baseTemplate from '@email/templates/base.template';

describe('baseTemplate', () => {
  const options = {
    title: 'Bienvenido',
    content: '<p>Hola Ana</p>',
    preheader: 'Tu cuenta está lista',
  };

  it('returns a complete html document', () => {
    const html = baseTemplate(options);

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="es">');
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('places the content between the header and the footer', () => {
    const html = baseTemplate(options);

    const header = html.indexOf('Eruditia</span>');
    const content = html.indexOf('<p>Hola Ana</p>');
    const footer = html.indexOf('Este es un correo automático');

    expect(header).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(header);
    expect(footer).toBeGreaterThan(content);
  });

  it('inserts the content as html without escaping it', () => {
    expect(baseTemplate(options)).toContain('<p>Hola Ana</p>');
  });

  it('keeps the same header and footer whatever the content', () => {
    const strip = (html: string, content: string) => html.replace(content, '');

    const first = baseTemplate({ title: 'A', content: '<p>Uno</p>' });
    const second = baseTemplate({ title: 'A', content: '<h1>Dos</h1>' });

    expect(strip(first, '<p>Uno</p>')).toBe(strip(second, '<h1>Dos</h1>'));
  });

  it('sets the escaped title', () => {
    expect(baseTemplate({ ...options, title: 'Hola <b>' })).toContain(
      '<title>Hola &lt;b&gt;</title>',
    );
  });

  it('includes the escaped preheader in a hidden block', () => {
    const html = baseTemplate({ ...options, preheader: 'Tu <código>' });

    expect(html).toMatch(
      /<div style="display: none;[^"]*">Tu &lt;código&gt;<\/div>/,
    );
  });

  it('renders an empty preheader when none is given', () => {
    const html = baseTemplate({ title: 'A', content: '<p>x</p>' });

    expect(html).toMatch(/<div style="display: none;[^"]*"><\/div>/);
  });

  it('shows the current year in the footer', () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-05-01T00:00:00Z'));

    expect(baseTemplate(options)).toContain('&copy; 2030 Eruditia');

    jest.useRealTimers();
  });
});
