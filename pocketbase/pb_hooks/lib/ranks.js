/// <reference path="../../pb_data/types.d.ts" />

const PLURAL = { regular: "Regulares", mitico: "Míticos", lendario: "Lendários" }

/** "Regulares" / "Míticos e Lendários" para os ranks permitidos do evento. */
function allowedLabel(event) {
  const names = event.getStringSlice("allowedRanks").map((r) => PLURAL[r])
  return names.length > 1 ? names.slice(0, -1).join(", ") + " e " + names[names.length - 1] : names[0]
}

/** Recusa jogador fora dos ranks do evento (vazio = todos). `who` = "Você" ou o nome do convidado. */
function assertRankAllowed(event, user, who) {
  const allowed = event.getStringSlice("allowedRanks")
  if (allowed.length === 0 || allowed.includes(user.getString("rank"))) return
  throw new BadRequestError(who === "Você"
    ? `Este evento é só para ${allowedLabel(event)}.`
    : `${who} não pode jogar este evento (só ${allowedLabel(event)}).`)
}

module.exports = { assertRankAllowed }
