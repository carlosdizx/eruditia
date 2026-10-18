import twoFactorCodeTemplate, {
  TWO_FACTOR_CODE_SUBJECT,
} from '@email/templates/two-factor-code.template';

describe('twoFactorCodeTemplate', () => {
  const options = { firstName: 'Ana', code: '012345', expiresInMinutes: 10 };

  it('is built on the base template', () => {
    const html = twoFactorCodeTemplate(options);

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('Eruditia</span>');
  });

  it('uses the subject as the document title', () => {
    expect(twoFactorCodeTemplate(options)).toContain(
      `<title>${TWO_FACTOR_CODE_SUBJECT}</title>`,
    );
  });

  it('greets the user and shows the code with its expiration', () => {
    const html = twoFactorCodeTemplate(options);

    expect(html).toContain('Hola, Ana');
    expect(html).toContain('<span class="code">012345</span>');
    expect(html).toContain('vence en 10 minutos');
  });

  it('escapes every dynamic value', () => {
    const html = twoFactorCodeTemplate({
      ...options,
      firstName: '<b>Ana</b>',
      code: '<x>',
    });

    expect(html).toContain('Hola, &lt;b&gt;Ana&lt;/b&gt;');
    expect(html).toContain('<span class="code">&lt;x&gt;</span>');
    expect(html).not.toContain('<b>Ana</b>');
  });
});
