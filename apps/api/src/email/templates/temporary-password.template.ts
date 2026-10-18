import baseTemplate from '@email/templates/base.template';
import escapeHtml from '@email/utils/escape-html.util';

export const TEMPORARY_PASSWORD_SUBJECT = 'Tu cuenta en Eruditia fue creada';

const temporaryPasswordTemplate = ({
  firstName,
  email,
  password,
}: {
  firstName: string;
  email: string;
  password: string;
}): string => {
  return baseTemplate({
    title: TEMPORARY_PASSWORD_SUBJECT,
    preheader: 'Aquí tienes tu contraseña temporal para ingresar',
    content: `
      <h1>Hola, ${escapeHtml(firstName)}</h1>
      <p>Se creó una cuenta para ti en Eruditia. Puedes ingresar con estos datos:</p>
      <p>
        <strong>Correo:</strong> ${escapeHtml(email)}<br>
        <strong>Contraseña temporal:</strong>
      </p>
      <p><span class="code">${escapeHtml(password)}</span></p>
      <p>Por seguridad, cambia tu contraseña después de ingresar por primera vez.</p>
      <p class="muted">Si no esperabas este correo, puedes ignorarlo o contactar al administrador de tu organización.</p>
    `,
  });
};

export default temporaryPasswordTemplate;
