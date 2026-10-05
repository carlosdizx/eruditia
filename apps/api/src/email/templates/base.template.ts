import escapeHtml from '@email/utils/escape-html.util';

const APP_NAME = 'Eruditia';

const baseTemplate = ({
  title,
  content,
  preheader = '',
}: {
  title: string;
  content: string;
  preheader?: string;
}): string => {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f4f7; }
    table { border-collapse: collapse; }
    img { border: 0; display: block; max-width: 100%; }
    .email-content h1 { margin: 0 0 16px; font-size: 22px; line-height: 30px; color: #1f2937; }
    .email-content h2 { margin: 24px 0 12px; font-size: 18px; line-height: 26px; color: #1f2937; }
    .email-content p { margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151; }
    .email-content a { color: #4f46e5; }
    .email-content .button { display: inline-block; padding: 12px 24px; border-radius: 6px; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; }
    .email-content .code { display: inline-block; padding: 8px 16px; border-radius: 6px; background-color: #f3f4f6; font-family: 'Courier New', Courier, monospace; font-size: 20px; letter-spacing: 2px; color: #111827; }
    .email-content .muted { font-size: 14px; color: #6b7280; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</div>
  <table role="presentation" style="background-color: #f4f4f7;">
    <tr>
      <td style="padding: 32px 12px;">
        <table role="presentation" class="email-container" style="width: 600px; max-width: 600px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <tr>
            <td class="email-padding" style="padding: 24px 40px; background-color: #4f46e5; border-radius: 8px 8px 0 0;">
              <span style="font-size: 24px; line-height: 32px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${APP_NAME}</span>
            </td>
          </tr>
          <tr>
            <td class="email-padding email-content" style="padding: 40px; background-color: #ffffff; font-size: 16px; line-height: 24px; color: #374151;">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 13px; line-height: 20px; color: #6b7280;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #9ca3af;">&copy; ${year} ${APP_NAME}. Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default baseTemplate;
