/// <reference path="../pb_data/types.d.ts" />

// Turma salva → sessões dos próximos 14 dias acompanham a grade. O cron diário rola a janela.
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/trainings.js`).sync(e.app, e.record)
  e.next()
}, "classes")

onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/lib/trainings.js`).sync(e.app, e.record)
  e.next()
}, "classes")

// 00:00 em Brasília
cronAdd("galaticos_trainings", "0 3 * * *", () => {
  const { sync } = require(`${__hooks}/lib/trainings.js`)
  for (const cls of $app.findAllRecords("classes")) sync($app, cls)
})

// Professor da turma precisa ser professor ou admin (admin escolhe quem; professor só a si mesmo, pela API rule).
onRecordValidate((e) => {
  let teacher
  try {
    teacher = e.app.findRecordById("users", e.record.getString("teacher"))
  } catch (_) {
    teacher = null
  }
  if (!teacher || !["professor", "admin"].includes(teacher.getString("role"))) {
    throw new BadRequestError("Escolha um professor.", { teacher: new ValidationError("not_teacher", "Não é professor.") })
  }
  e.next()
}, "classes")

// Token do passaporte de treino: aleatório, gerado aqui (a API rule recusa token no corpo).
onRecordCreate((e) => {
  e.record.set("token", $security.randomString(40))
  e.next()
}, "enrollments")

onRecordValidate((e) => {
  if (e.record.getString("cancelledAt") && !e.record.getString("cancellationReason").trim()) {
    throw new BadRequestError("Informe o motivo do cancelamento.", {
      cancellationReason: new ValidationError("required", "Obrigatório ao cancelar."),
    })
  }
  e.next()
}, "trainings")
