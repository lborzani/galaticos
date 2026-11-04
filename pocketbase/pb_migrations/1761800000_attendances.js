/// <reference path="../pb_data/types.d.ts" />

// Presença do aluno numa sessão de treino. Só o servidor grava (scanner, pb_hooks/attendance.pb.js).
migrate((app) => {
  const visible = "student = @request.auth.id || @request.auth.role = 'admin'"
    + " || (@request.auth.role = 'professor' && training.class.teacher = @request.auth.id)"
  const attendances = new Collection({
    type: "base",
    name: "attendances",
    listRule: visible,
    viewRule: visible,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "training", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("trainings").id, cascadeDelete: true },
      { name: "student", type: "relation", required: true, maxSelect: 1, collectionId: "_pb_users_auth_", cascadeDelete: true },
      { name: "attendedBy", type: "relation", maxSelect: 1, collectionId: "_pb_users_auth_" },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_attendances_training_student ON attendances (training, student)"],
  })
  app.save(attendances)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("attendances"))
})
