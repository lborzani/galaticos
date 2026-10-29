/// <reference path="../pb_data/types.d.ts" />

// Telefone: o app lê e escreve `phone`; o banco guarda em `phonePrivate` (oculto, ver a migration).
// O PocketBase descarta campo oculto do corpo, mas `phone` não é campo e chega aqui intacto.
// Cadastro exige o número (menos superuser, no painel /_/) e ninguém apaga o próprio depois.
onRecordCreateRequest((e) => {
  const phone = String(e.requestInfo().body.phone ?? "").trim()
  if (!phone && !e.hasSuperuserAuth()) {
    throw new BadRequestError("Informe o telefone.", { phone: new ValidationError("required", "Obrigatório.") })
  }
  if (phone) e.record.set("phonePrivate", phone)
  e.next()
}, "users")

onRecordUpdateRequest((e) => {
  const body = e.requestInfo().body
  if ("phone" in body) {
    const phone = String(body.phone ?? "").trim()
    if (!phone) throw new BadRequestError("Informe o telefone.", { phone: new ValidationError("required", "Obrigatório.") })
    e.record.set("phonePrivate", phone)
  }
  e.next()
}, "users")

// Erro do `pattern` vem como `phonePrivate`; o app espera `phone`.
onRecordValidate((e) => {
  try {
    e.next()
  } catch (err) {
    if (String(err).includes("phonePrivate")) {
      throw new BadRequestError("Telefone inválido.", { phone: new ValidationError("invalid", "Telefone inválido.") })
    }
    throw err
  }
}, "users")

// Só o dono e os admins recebem `phone` (inclusive em expand e realtime).
onRecordEnrich((e) => {
  const auth = e.requestInfo.auth
  if (auth && (auth.id === e.record.id || auth.getString("role") === "admin")) {
    e.record.withCustomData(true)
    e.record.set("phone", e.record.getString("phonePrivate"))
  }
  e.next()
}, "users")
