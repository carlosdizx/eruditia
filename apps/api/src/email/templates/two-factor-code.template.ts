import baseTemplate from '@email/templates/base.template';
import escapeHtml from '@email/utils/escape-html.util';

export const TWO_FACTOR_CODE_SUBJECT = 'Tu código de verificación de Eruditia';

const twoFactorCodeTemplate = ({
  firstName,
  code,
  expiresInMinutes,
}: {
  firstName: string;
  code: string;
  expiresInMinutes: number;
}): string => {
  return baseTemplate({
    title: TWO_FACTOR_CODE_SUBJECT,
    preheader: 'Usa este código para terminar de iniciar sesión',
    content: `
      <h1>Hola, ${escapeHtml(firstName)}</h1>
      <p>Usa este código para terminar de iniciar sesión en Eruditia:</p>
      <p><span class="code">${escapeHtml(code)}</span></p>
      <p>El código vence en ${expiresInMinutes} minutos y solo puede usarse una vez.</p>
      <p class="muted">Si no intentaste iniciar sesión, cambia tu contraseña: alguien más la conoce.</p>
    `,
  });
};

export default twoFactorCodeTemplate;
