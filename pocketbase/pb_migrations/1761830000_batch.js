/// <reference path="../pb_data/types.d.ts" />

// Batch API: o formulário cria a série de eventos recorrentes num lote só (tudo ou nada). As API rules
// de cada coleção continuam valendo para cada item do lote.
migrate((app) => {
  const settings = app.settings()
  settings.batch.enabled = true
  settings.batch.maxRequests = 20
  app.save(settings)
}, (app) => {
  const settings = app.settings()
  settings.batch.enabled = false
  app.save(settings)
})
