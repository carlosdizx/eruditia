import temporaryPasswordTemplate, {
  TEMPORARY_PASSWORD_SUBJECT,
} from '@email/templates/temporary-password.template';

describe('temporaryPasswordTemplate', () => {
  const options = {
    firstName: 'Ana',
    email: 'ana@example.com',
    password: 'abcd-efgh-ijkl',
  };

  it('is built on the base template', () => {
    const html = temporaryPasswordTemplate(options);

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('Eruditia</span>');
    expect(html).toContain('Este es un correo automático');
  });

  it('uses the subject as the document title', () => {
    expect(temporaryPasswordTemplate(options)).toContain(
      `<title>${TEMPORARY_PASSWORD_SUBJECT}</title>`,
    );
  });

  it('greets the user by first name', () => {
    expect(temporaryPasswordTemplate(options)).toContain('Hola, Ana');
  });

  it('includes the email and the temporary password', () => {
    const html = temporaryPasswordTemplate(options);

    expect(html).toContain('ana@example.com');
    expect(html).toContain('<span class="code">abcd-efgh-ijkl</span>');
  });

  it('escapes every dynamic value', () => {
    const html = temporaryPasswordTemplate({
      firstName: '<b>Ana</b>',
      email: 'a&b@example.com',
      password: '<x>',
    });

    expect(html).toContain('Hola, &lt;b&gt;Ana&lt;/b&gt;');
    expect(html).toContain('a&amp;b@example.com');
    expect(html).toContain('<span class="code">&lt;x&gt;</span>');
    expect(html).not.toContain('<b>Ana</b>');
  });
});
