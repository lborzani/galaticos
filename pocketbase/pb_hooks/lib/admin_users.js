/// <reference path="../../pb_data/types.d.ts" />

// Gestão de usuários pelo admin. Funções recebem o txApp de um runInTransaction.

const RANKS = ["regular", "mitico", "lendario"]
const ROLES = ["member", "admin", "professor"]

function loadUser(txApp, id) {
  try {
    return txApp.findRecordById("users", id)
  } catch (_) {
    throw new NotFoundError("Usuário não encontrado.")
  }
}

/** Muda rank e/ou papel, ou verifica a conta. O admin não muda o próprio papel (sempre sobra um admin). */
function update(txApp, adminId, userId, body) {
  const user = loadUser(txApp, userId)
  if (body.rank !== undefined) {
    if (!RANKS.includes(body.rank)) throw new BadRequestError("Rank inválido.")
    user.set("rank", body.rank)
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) throw new BadRequestError("Papel inválido.")
    if (userId === adminId) throw new BadRequestError("Você não pode mudar o próprio papel.")
    user.set("role", body.role)
  }
  // libera conta sem o e-mail de confirmação (SES em sandbox não entrega para qualquer endereço)
  if (body.verified === true) user.set("verified", true)
  txApp.saveNoValidate(user) // conta antiga pode não ter telefone
}

/**
 * Bane: desloga na hora (novo tokenKey), tira de inscrições e convites de eventos futuros (o time do
 * capitão se desfaz, a fila anda) e apaga os aparelhos de push. Devolve [{ eventId, promoted }] para avisar.
 */
function ban(txApp, adminId, userId, reason) {
  reason = String(reason || "").trim()
  if (!reason) throw new BadRequestError("Informe o motivo.", { reason: new ValidationError("required", "Obrigatório.") })
  if (reason.length > 300) throw new BadRequestError("Motivo muito longo (máx. 300).")
  if (userId === adminId) throw new BadRequestError("Você não pode banir a si mesmo.")

  const user = loadUser(txApp, userId)
  user.set("bannedAt", new DateTime())
  user.set("banReason", reason)
  user.set("bannedBy", adminId)
  user.refreshTokenKey()
  txApp.saveNoValidate(user)

  const now = new DateTime().string()
  const { cancel } = require(`${__hooks}/lib/registrations.js`)
  const regs = txApp.findRecordsByFilter("registrations",
    "user = {:u} && (status = 'confirmed' || status = 'waitlist') && event.eventDate > {:now} && event.cancelledAt = ''",
    "", 0, 0, { u: userId, now })
  const promoted = regs.map((reg) => ({ eventId: reg.getString("event"), promoted: cancel(txApp, reg.getString("event"), userId).promoted }))

  const invites = txApp.findRecordsByFilter("invites",
    "player = {:u} && (status = 'pending' || status = 'accepted') && event.eventDate > {:now}", "", 0, 0, { u: userId, now })
  for (const invite of invites) {
    invite.set("status", "cancelled")
    txApp.save(invite)
  }

  for (const sub of txApp.findRecordsByFilter("push_subscriptions", "user = {:u}", "", 0, 0, { u: userId })) txApp.delete(sub)
  return promoted
}

function unban(txApp, userId) {
  const user = loadUser(txApp, userId)
  user.set("bannedAt", "")
  user.set("banReason", "")
  user.set("bannedBy", "")
  txApp.saveNoValidate(user)
}

const INVITE_TTL = 7 * 24 * 3600 // o reset padrão (30 min) é curto para convite

/**
 * Cadastro feito pelo admin: conta já verificada, senha aleatória que ninguém sabe, e o e-mail com o link
 * para a pessoa criar a dela. O link é um token de reset de senha do PocketBase (mesmas claims e chave de
 * core.Record.NewPasswordResetToken), só que com validade maior: o app confirma com `confirmPasswordReset`,
 * e trocar a senha gira o tokenKey, então o link vale uma vez. Se o envio falhar, a transação desfaz o cadastro.
 */
function invite(txApp, body) {
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const phone = String(body.phone || "").trim()
  const rank = body.rank || "regular"
  const role = body.role || "member"
  if (name.length < 2 || name.length > 50) {
    throw new BadRequestError("Nome deve ter de 2 a 50 caracteres.", { name: new ValidationError("invalid", "Nome inválido.") })
  }
  if (!phone) throw new BadRequestError("Informe o telefone.", { phone: new ValidationError("required", "Obrigatório.") })
  if (!RANKS.includes(rank)) throw new BadRequestError("Rank inválido.")
  if (!ROLES.includes(role)) throw new BadRequestError("Papel inválido.")
  let existing = null
  try {
    existing = txApp.findAuthRecordByEmail("users", email)
  } catch (_) { /* não achar é o caminho feliz */ }
  if (existing) throw new BadRequestError("Já existe uma conta com esse e-mail.", { email: new ValidationError("not_unique", "E-mail já cadastrado.") })

  const users = txApp.findCollectionByNameOrId("users")
  const user = new Record(users)
  user.set("name", name)
  user.set("email", email)
  user.set("phonePrivate", phone)
  user.set("rank", rank)
  user.set("role", role)
  user.set("verified", true)
  user.setPassword($security.randomString(40))
  try {
    txApp.save(user) // telefone inválido vira 400 "Telefone inválido." no onRecordValidate de users.pb.js
  } catch (err) {
    if (String(err).includes("email:")) {
      throw new BadRequestError("E-mail inválido.", { email: new ValidationError("invalid", "E-mail inválido.") })
    }
    throw err
  }

  const token = $security.createJWT(
    { type: "passwordReset", id: user.id, collectionId: users.id, email: user.email() },
    user.tokenKey() + users.passwordResetToken.secret,
    INVITE_TTL,
  )
  require(`${__hooks}/lib/email.js`).sendInvite(txApp, user, token)
  return user
}

module.exports = { update, ban, unban, invite }
