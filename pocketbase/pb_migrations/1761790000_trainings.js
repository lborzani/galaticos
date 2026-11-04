/// <reference path="../pb_data/types.d.ts" />

// Treinos: o professor tem turmas com grade semanal fixa (dias + hora + duração) e alunos matriculados.
// As sessões (`trainings`) são geradas pelo servidor (pb_hooks/trainings.pb.js); professor só cancela.
// A matrícula tem o token do passaporte de treino, o mesmo em todas as sessões da turma.
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] // índice = Date.getUTCDay()

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.getByName("role").values = ["member", "admin", "professor"]
  app.save(users)

  const isAdmin = "@request.auth.role = 'admin'"
  const isTeacher = "(@request.auth.role = 'professor' && teacher = @request.auth.id)"
  const classes = new Collection({
    type: "base",
    name: "classes",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: `${isAdmin} || (@request.auth.role = 'professor' && @request.body.teacher = @request.auth.id)`,
    updateRule: `${isAdmin} || (${isTeacher} && (@request.body.teacher:isset = false || @request.body.teacher = @request.auth.id))`,
    // apagar a turma apaga sessões, matrículas e presenças (o painel avisa antes)
    deleteRule: `${isAdmin} || ${isTeacher}`,
    fields: [
      { name: "name", type: "text", required: true, min: 3, max: 80 },
      { name: "court", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("courts").id },
      { name: "teacher", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_" },
      { name: "weekdays", type: "select", required: true, maxSelect: 7, values: WEEKDAYS },
      { name: "startTime", type: "text", required: true, pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
      { name: "durationMin", type: "number", required: true, min: 15, max: 480, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(classes)

  const classTeacher = `(@request.auth.role = 'professor' && class.teacher = @request.auth.id)`
  const enrollments = new Collection({
    type: "base",
    name: "enrollments",
    listRule: `student = @request.auth.id || ${classTeacher} || ${isAdmin}`,
    viewRule: `student = @request.auth.id || ${classTeacher} || ${isAdmin}`,
    createRule: `(${classTeacher} || ${isAdmin}) && @request.body.token:isset = false`,
    updateRule: null,
    deleteRule: `${classTeacher} || ${isAdmin}`,
    fields: [
      { name: "class", type: "relation", required: true, maxSelect: 1, collectionId: classes.id, cascadeDelete: true },
      { name: "student", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      // gerado no servidor ao matricular (pb_hooks/trainings.pb.js)
      { name: "token", type: "text", max: 64 },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_enrollments_class_student ON enrollments (class, student)",
      "CREATE UNIQUE INDEX idx_enrollments_token ON enrollments (token)",
    ],
  })
  app.save(enrollments)

  const trainings = new Collection({
    type: "base",
    name: "trainings",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: null,
    // professor só cancela (motivo obrigatório no hook); o resto é do gerador
    updateRule: `(${classTeacher} || ${isAdmin}) && cancelledAt = '' && @request.body.cancelledAt:isset = true`
      + " && @request.body.class:isset = false && @request.body.startsAt:isset = false && @request.body.endsAt:isset = false",
    deleteRule: null,
    fields: [
      { name: "class", type: "relation", required: true, maxSelect: 1, collectionId: classes.id, cascadeDelete: true },
      { name: "startsAt", type: "date", required: true },
      { name: "endsAt", type: "date", required: true },
      { name: "cancelledAt", type: "date" },
      { name: "cancellationReason", type: "text", max: 300 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_trainings_class_start ON trainings (class, startsAt)",
      "CREATE INDEX idx_trainings_start ON trainings (startsAt)",
    ],
  })
  app.save(trainings)
}, (app) => {
  for (const name of ["trainings", "enrollments", "classes"]) app.delete(app.findCollectionByNameOrId(name))
  const users = app.findCollectionByNameOrId("users")
  for (const u of app.findRecordsByFilter("users", "role = 'professor'", "", 0, 0)) {
    u.set("role", "member")
    app.saveNoValidate(u)
  }
  users.fields.getByName("role").values = ["member", "admin"]
  app.save(users)
})
