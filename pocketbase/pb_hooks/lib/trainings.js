/// <reference path="../../pb_data/types.d.ts" />

// Sessões de treino geradas a partir da grade da turma (dias da semana + hora + duração).

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] // índice = Date.getUTCDay()
// ponytail: hora de Brasília com offset fixo (sem horário de verão desde 2019). Vira fuso configurável se surgir turma fora do BR.
const OFFSET_MS = -3 * 3600000
const HORIZON_MS = 14 * 86400000

const EARLY_MS = 3600000 // presença vale a partir de 1h antes do início

const pbDate = (ms) => new Date(ms).toISOString().replace("T", " ") // formato salvo pelo PocketBase, comparável em filtro
const ms = (record, field) => record.getDateTime(field).unix() * 1000

function findOptional(app, collection, filter, params) {
  try {
    return app.findFirstRecordByFilter(collection, filter, params)
  } catch (_) {
    return null
  }
}

/** Inícios (ms UTC) da grade da turma em (now, now + 14 dias]: sempre duas sessões por dia da semana. */
function slots(cls, now) {
  const [h, m] = cls.getString("startTime").split(":").map(Number)
  const days = Array.from(cls.getStringSlice("weekdays"))
  const local = new Date(now + OFFSET_MS) // campos UTC = relógio de Brasília
  const out = []
  for (let d = 0; d <= 14; d++) {
    const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + d)
    if (!days.includes(WEEKDAYS[new Date(day).getUTCDay()])) continue
    const start = day + (h * 60 + m) * 60000 - OFFSET_MS
    if (start > now && start <= now + HORIZON_MS) out.push(start)
  }
  return out
}

/**
 * Deixa as sessões futuras da turma iguais à grade: cria as que faltam, ajusta o fim se a duração mudou
 * e apaga as que saíram da grade (menos as que já têm presença). Sessão que já começou não muda.
 */
function sync(app, cls, now = Date.now()) {
  const wanted = new Set(slots(cls, now))
  const duration = cls.getInt("durationMin") * 60000
  const future = app.findRecordsByFilter("trainings", "class = {:c} && startsAt > {:now}", "", 0, 0, { c: cls.id, now: pbDate(now) })
  for (const t of future) {
    const start = ms(t, "startsAt")
    if (!wanted.delete(start)) {
      if (!findOptional(app, "attendances", "training = {:t}", { t: t.id })) app.delete(t)
    } else if (ms(t, "endsAt") !== start + duration) {
      t.set("endsAt", pbDate(start + duration))
      app.save(t)
    }
  }
  const collection = app.findCollectionByNameOrId("trainings")
  for (const start of wanted) {
    const t = new Record(collection)
    t.set("class", cls.id)
    t.set("startsAt", pbDate(start))
    t.set("endsAt", pbDate(start + duration))
    app.save(t)
  }
}

/**
 * Resolve o QR lido no scanner. Passaporte de evento: só admin (lib/registrations.js). Passaporte de treino
 * (token da matrícula): admin ou o professor da turma, de 1h antes do início até o fim da sessão.
 */
function lookup(app, token, auth) {
  token = String(token || "")
  const admin = auth.getString("role") === "admin"
  const enrollment = findOptional(app, "enrollments", "token = {:t}", { t: token })
  if (!enrollment) {
    if (admin) return require(`${__hooks}/lib/registrations.js`).checkPassport(app, token)
    if (findOptional(app, "passports", "token = {:t}", { t: token })) throw new ForbiddenError("Só admins validam passaportes de evento.")
    throw new NotFoundError("QR Code inválido.")
  }

  const cls = app.findRecordById("classes", enrollment.getString("class"))
  if (!admin && cls.getString("teacher") !== auth.id) throw new ForbiddenError("Esse aluno é de outra turma.")
  const user = app.findRecordById("users", enrollment.getString("student"))
  const now = Date.now()
  const [training] = app.findRecordsByFilter("trainings", "class = {:c} && startsAt <= {:soon} && endsAt >= {:now}", "startsAt", 1, 0,
    { c: cls.id, soon: pbDate(now + EARLY_MS), now: pbDate(now) })
  if (!training) throw new BadRequestError(`Nenhum treino de ${cls.getString("name")} agora.`)
  if (training.getString("cancelledAt")) throw new BadRequestError("Esse treino foi cancelado.")
  const alreadyAttended = !!findOptional(app, "attendances", "training = {:t} && student = {:s}", { t: training.id, s: user.id })
  return { kind: "training", training, class: cls, user, alreadyAttended }
}

/** Confirma a presença do QR lido (evento ou treino). Segunda leitura não grava de novo. */
function checkIn(app, token, auth) {
  const r = lookup(app, token, auth)
  if (r.kind !== "training") return require(`${__hooks}/lib/registrations.js`).attend(app, token, auth.id)
  if (r.alreadyAttended) return r
  const a = new Record(app.findCollectionByNameOrId("attendances"))
  a.set("training", r.training.id)
  a.set("student", r.user.id)
  a.set("attendedBy", auth.id)
  app.save(a)
  return r
}

module.exports = { sync, slots, lookup, checkIn }
