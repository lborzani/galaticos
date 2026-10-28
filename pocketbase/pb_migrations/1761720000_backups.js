/// <reference path="../pb_data/types.d.ts" />

// Backup automático diário do pb_data (banco + arquivos), guardado em pb_data/backups.
migrate((app) => {
  const settings = app.settings()
  settings.backups.cron = $os.getenv("BACKUP_CRON") || "0 4 * * *"
  settings.backups.cronMaxKeep = parseInt($os.getenv("BACKUP_KEEP") || "14")
  app.save(settings)
}, (app) => {
  const settings = app.settings()
  settings.backups.cron = ""
  app.save(settings)
})
