/// <reference path="../../pb_data/types.d.ts" />

// E-mails enviados pelos hooks, com a mesma cara dos templates do PocketBase (migration email_templates).
// HTML de e-mail = tabelas + estilos inline (Gmail/Outlook ignoram o resto).

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const p = (text) => `<p style="margin:0 0 16px">${text}</p>`
const note = (text) => `<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#6B7280">${text}</p>`

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr><td bgcolor="#7C3AED" style="border-radius:10px">
    <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
  </td></tr>
</table>
<p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#6B7280">Se o botão não funcionar, copie e cole no navegador:<br><a href="${href}" style="color:#6D28D9;word-break:break-all">${href}</a></p>`

const layout = (appName, appUrl, title, content) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5F7">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
      <tr><td align="center" bgcolor="#1E1033" style="padding:28px 24px;border-radius:16px 16px 0 0">
        <img src="${appUrl}/pwa-192.png" width="88" height="88" alt="${appName}" style="display:block;border:0;border-radius:20px">
      </td></tr>
      <tr><td bgcolor="#FFFFFF" style="padding:32px 32px 8px;border-radius:0 0 16px 16px;font-family:${font};font-size:16px;line-height:24px;color:#1F1F23">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:#1F1F23">${title}</h1>
        ${content}
      </td></tr>
      <tr><td align="center" style="padding:20px 24px;font-family:${font};font-size:12px;line-height:18px;color:#8E8E93">
        Você recebeu este e-mail porque tem uma conta no <a href="${appUrl}" style="color:#8E8E93">${appName}</a>.<br>Este endereço não recebe respostas.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

/** Convite de cadastro feito pelo admin: link para a pessoa criar a senha. */
function sendInvite(app, user, token) {
  const { appName, appURL, senderName, senderAddress } = app.settings().meta
  const name = esc(user.getString("name").split(" ")[0])
  const html = layout(appName, appURL, "Finalize seu cadastro",
    p(`Olá, ${name}! A organização criou sua conta no ${appName}. Falta só criar sua senha para entrar.`) +
    button(`${appURL}/finalizar-cadastro/${token}`, "Criar minha senha") +
    note("O link vale por 7 dias. Depois disso, use \"Esqueci a senha\" na tela de login."))
  app.newMailClient().send(new MailerMessage({
    from: { address: senderAddress, name: senderName },
    to: [{ address: user.email() }],
    subject: `Finalize seu cadastro no ${appName}`,
    html,
  }))
}

module.exports = { sendInvite }
