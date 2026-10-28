/// <reference path="../../pb_data/types.d.ts" />

// Quem recebe cada aviso. A entrega criptografada é feita pelo sidecar push/server.ts (PUSH_URL).
// Push é melhor esforço: falha no envio só vai para o log, nunca desfaz a operação que o disparou.

const fmtDate = (d) => d.toISOString().replace("T", " ")

/** Envia `payload` para todos os aparelhos dos usuários. Chamar fora de transação (faz HTTP). */
function notify(app, userIds, payload) {
  const url = $os.getenv("PUSH_URL")
  const ids = [...new Set(userIds)].filter(Boolean)
  if (!url || ids.length === 0) return

  const params = {}
  const filter = ids.map((id, i) => { params["u" + i] = id; return `user = {:u${i}}` }).join(" || ")
  const subs = app.findRecordsByFilter("push_subscriptions", filter, "", 0, 0, params)
  if (subs.length === 0) return

  try {
    const res = $http.send({
      url: url.replace(/\/$/, "") + "/send",
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + $os.getenv("PUSH_SECRET") },
      body: JSON.stringify({
        payload,
        subscriptions: subs.map((s) => ({ endpoint: s.getString("endpoint"), keys: { p256dh: s.getString("p256dh"), auth: s.getString("auth") } })),
      }),
      timeout: 15,
    })
    if (res.statusCode !== 200) return app.logger().error("push: sidecar respondeu " + res.statusCode)
    for (const endpoint of res.json.gone || []) {
      const dead = subs.find((s) => s.getString("endpoint") === endpoint)
      if (dead) app.delete(dead)
    }
  } catch (err) {
    app.logger().error("push: sidecar indisponível", "error", String(err))
  }
}

/** Quem está no evento: confirmados/presentes, membros aceitos dos times Prime e, se pedido, a fila. */
function audience(app, eventId, withWaitlist) {
  const statuses = withWaitlist ? "(status = 'confirmed' || status = 'attended' || status = 'waitlist')" : "(status = 'confirmed' || status = 'attended')"
  const regs = app.findRecordsByFilter("registrations", `event = {:e} && ${statuses}`, "", 0, 0, { e: eventId })
  const team = app.findRecordsByFilter("invites", "event = {:e} && status = 'accepted'", "", 0, 0, { e: eventId })
  return regs.map((r) => r.getString("user")).concat(team.map((i) => i.getString("player")))
}

const eventUrl = (event) => "/evento/" + event.id

function eventCancelled(app, event) {
  notify(app, audience(app, event.id, true), {
    title: "Evento cancelado",
    body: `${event.getString("title")} foi cancelado. Motivo: ${event.getString("cancellationReason")}`,
    url: eventUrl(event),
    tag: "cancel-" + event.id,
  })
}

function promoted(app, eventId, userIds) {
  if (userIds.length === 0) return
  const event = app.findRecordById("events", eventId)
  notify(app, userIds, {
    title: "Você foi confirmado!",
    body: `Abriu vaga e você saiu da lista de espera de ${event.getString("title")}.`,
    url: eventUrl(event),
    tag: "promoted-" + eventId,
  })
}

/**
 * Lembretes de 1 h e 5 min antes. Roda todo minuto (cron) e é idempotente: cada lembrete marca
 * o evento ao sair. Se o servidor ficou fora e já faltam ≤5 min, manda só o de 5 min.
 */
function runReminders(app) {
  const now = Date.now()
  const at = (min) => fmtDate(new Date(now + min * 60000))
  const sent = []

  const send = (event, which) => {
    const title = event.getString("title")
    notify(app, audience(app, event.id, false), which === "5m"
      ? { title: "Já está começando!", body: `${title} começa em 5 minutos!`, url: eventUrl(event), tag: "reminder-" + event.id }
      : { title: "Falta 1 hora!", body: `${title} começa em 1 hora, em ${event.getString("location")}.`, url: eventUrl(event), tag: "reminder-" + event.id })
    sent.push({ event: event.id, which })
  }

  const due = (flag, minutes) => app.findRecordsByFilter("events",
    `cancelledAt = '' && ${flag} = false && eventDate > {:now} && eventDate <= {:limit}`, "eventDate", 0, 0,
    { now: at(0), limit: at(minutes) })

  for (const event of due("reminded5m", 5)) {
    send(event, "5m")
    event.set("reminded5m", true)
    event.set("reminded1h", true)
    app.save(event)
  }
  for (const event of due("reminded1h", 60)) {
    send(event, "1h")
    event.set("reminded1h", true)
    app.save(event)
  }
  return sent
}

module.exports = { notify, eventCancelled, promoted, runReminders }
