import type PocketBase from 'pocketbase'
import { describe, expect, inject, it } from 'vitest'
import { eventData, member } from './helpers'

const uid = (pb: PocketBase) => pb.authStore.record!.id
const time = (s: string) => new Date(s.replace(' ', 'T')).getTime()
/** Hora de Brasília (offset fixo -03:00) como os campos UTC de um Date. */
const brt = (s: string) => new Date(time(s) - 3 * 3600_000)

function classData(teacher: string, over: Record<string, unknown> = {}) {
  return { name: 'Turma Iniciante', court: inject('courtId'), teacher, weekdays: ['seg', 'qui'], startTime: '19:30', durationMin: 90, ...over }
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
/** Grade com uma sessão que começa daqui a `min` minutos (hora de Brasília). */
function startingIn(min: number) {
  const d = new Date(Date.now() + min * 60_000 - 3 * 3600_000)
  return { weekdays: [WEEKDAYS[d.getUTCDay()]], startTime: d.toISOString().slice(11, 16) }
}

const post = (pb: PocketBase, path: string, body?: object) => pb.send(path, { method: 'POST', body })

/** Professor com turma (sessão daqui a `min` minutos) e um aluno matriculado. */
async function enrolled(min = 30) {
  const prof = await member('Prof', 'professor')
  const aluno = await member('Aluna')
  const cls = await prof.collection('classes').create(classData(uid(prof), startingIn(min)))
  const { token } = await prof.collection('enrollments').create({ class: cls.id, student: uid(aluno) })
  return { prof, aluno, cls, token: token as string }
}

const sessions = (pb: PocketBase, classId: string) =>
  pb.collection('trainings').getFullList({ filter: pb.filter('class = {:c}', { c: classId }), sort: 'startsAt' })

describe('treinos', () => {
  it('admin torna alguém professor; professor cria turma só para si; membro não cria', async () => {
    const adm = await member('Admin', 'admin')
    const prof = await member('Prof')
    const outro = await member()
    await expect(prof.collection('classes').create(classData(uid(prof)))).rejects.toThrow()

    await adm.send(`/api/g/admin/users/${uid(prof)}`, { method: 'POST', body: { role: 'professor' } })
    await prof.collection('users').authRefresh()
    await expect(prof.collection('classes').create(classData(uid(adm)))).rejects.toThrow()
    await prof.collection('classes').create(classData(uid(prof)))
    await expect(outro.collection('classes').create(classData(uid(outro)))).rejects.toThrow()
    // admin escolhe o professor, mas tem que ser professor
    await expect(adm.collection('classes').create(classData(uid(outro)))).rejects.toMatchObject({ status: 400 })
    await adm.collection('classes').create(classData(uid(prof)))
  })

  it('turma gera duas sessões por dia da semana na hora de Brasília, sem duplicar ao salvar de novo', async () => {
    const prof = await member('Prof', 'professor')
    const cls = await prof.collection('classes').create(classData(uid(prof)))
    const list = await sessions(prof, cls.id)
    expect(list).toHaveLength(4)
    for (const t of list) {
      const start = brt(t.startsAt)
      expect([1, 4]).toContain(start.getUTCDay())
      expect([start.getUTCHours(), start.getUTCMinutes()]).toEqual([19, 30])
      expect(time(t.endsAt) - time(t.startsAt)).toBe(90 * 60_000)
      expect(time(t.startsAt)).toBeGreaterThan(Date.now())
    }

    await prof.collection('classes').update(cls.id, { name: 'Turma Renomeada' })
    expect((await sessions(prof, cls.id)).map((t) => t.id)).toEqual(list.map((t) => t.id))
  })

  it('mudar a grade troca as sessões futuras e a duração ajusta o fim', async () => {
    const prof = await member('Prof', 'professor')
    const cls = await prof.collection('classes').create(classData(uid(prof)))
    await prof.collection('classes').update(cls.id, { weekdays: ['ter'], durationMin: 60 })
    const list = await sessions(prof, cls.id)
    expect(list).toHaveLength(2)
    for (const t of list) {
      expect(brt(t.startsAt).getUTCDay()).toBe(2)
      expect(time(t.endsAt) - time(t.startsAt)).toBe(60 * 60_000)
    }
  })

  it('professor da turma cancela sessão só com motivo; outro professor não', async () => {
    const prof = await member('Prof', 'professor')
    const outro = await member('Outro', 'professor')
    const cls = await prof.collection('classes').create(classData(uid(prof)))
    const [t] = await sessions(prof, cls.id)
    const cancelledAt = new Date().toISOString()

    await expect(outro.collection('trainings').update(t.id, { cancelledAt, cancellationReason: 'Chuva' })).rejects.toThrow()
    await expect(prof.collection('trainings').update(t.id, { cancelledAt })).rejects.toMatchObject({ status: 400 })
    await expect(prof.collection('trainings').update(t.id, { startsAt: cancelledAt })).rejects.toThrow()
    await prof.collection('trainings').update(t.id, { cancelledAt, cancellationReason: 'Chuva' })
    expect(await prof.collection('trainings').getOne(t.id)).toMatchObject({ cancellationReason: 'Chuva' })
    // cancelada continua na grade: salvar a turma não recria
    await prof.collection('classes').update(cls.id, { name: 'Outro nome' })
    expect((await sessions(prof, cls.id)).find((s) => s.id === t.id)?.cancelledAt).toBeTruthy()
  })

  it('só o professor da turma matricula; token gerado e visível só para aluno, professor e admin', async () => {
    const prof = await member('Prof', 'professor')
    const outroProf = await member('Outro', 'professor')
    const aluno = await member('Aluno')
    const curioso = await member('Curioso')
    const adm = await member('Admin', 'admin')
    const cls = await prof.collection('classes').create(classData(uid(prof)))
    const data = { class: cls.id, student: uid(aluno) }

    await expect(outroProf.collection('enrollments').create(data)).rejects.toThrow()
    await expect(aluno.collection('enrollments').create(data)).rejects.toThrow()
    await expect(prof.collection('enrollments').create({ ...data, token: 'x'.repeat(40) })).rejects.toThrow()
    const enr = await prof.collection('enrollments').create(data)
    expect(enr.token).toHaveLength(40)
    await expect(prof.collection('enrollments').create(data)).rejects.toThrow() // já matriculado

    expect((await aluno.collection('enrollments').getOne(enr.id)).token).toBe(enr.token)
    expect((await adm.collection('enrollments').getOne(enr.id)).token).toBe(enr.token)
    await expect(curioso.collection('enrollments').getOne(enr.id)).rejects.toMatchObject({ status: 404 })
    await expect(outroProf.collection('enrollments').getOne(enr.id)).rejects.toMatchObject({ status: 404 })

    await expect(aluno.collection('enrollments').delete(enr.id)).rejects.toThrow()
    await prof.collection('enrollments').delete(enr.id)
  })
})

describe('presença no treino pelo passaporte', () => {
  it('professor da turma lê o QR e confirma a presença uma vez só', async () => {
    const { prof, aluno, cls, token } = await enrolled()
    const look = await post(prof, '/api/g/passports/lookup', { token })
    expect(look).toMatchObject({ kind: 'training', alreadyAttended: false, user: { name: 'Aluna' }, class: { id: cls.id } })
    expect(look.user.email).toBeFalsy()

    const first = await post(prof, '/api/g/passports/attend', { token })
    expect(first.alreadyAttended).toBe(false)
    expect((await post(prof, '/api/g/passports/attend', { token })).alreadyAttended).toBe(true)
    const mine = await aluno.collection('attendances').getFullList()
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ training: look.training.id, student: uid(aluno), attendedBy: uid(prof) })
  })

  it('sem treino agora ou treino cancelado: erro claro', async () => {
    const later = await enrolled(3 * 60)
    await expect(post(later.prof, '/api/g/passports/lookup', { token: later.token }))
      .rejects.toMatchObject({ status: 400, message: 'Nenhum treino de Turma Iniciante agora.' })

    const { prof, cls, token } = await enrolled()
    const [t] = await sessions(prof, cls.id)
    await prof.collection('trainings').update(t.id, { cancelledAt: new Date().toISOString(), cancellationReason: 'Chuva' })
    await expect(post(prof, '/api/g/passports/attend', { token })).rejects.toMatchObject({ status: 400, message: 'Esse treino foi cancelado.' })
  })

  it('membro e professor de outra turma recebem 403; admin valida; professor não valida evento', async () => {
    const { aluno, token } = await enrolled()
    const outroProf = await member('Outro', 'professor')
    await expect(post(aluno, '/api/g/passports/lookup', { token })).rejects.toMatchObject({ status: 403 })
    await expect(post(outroProf, '/api/g/passports/attend', { token })).rejects.toMatchObject({ status: 403 })
    await expect(post(outroProf, '/api/g/passports/lookup', { token: 'x'.repeat(40) })).rejects.toMatchObject({ status: 404 })
    expect((await post(await member('Admin', 'admin'), '/api/g/passports/attend', { token })).kind).toBe('training')

    const adm = await member('Admin', 'admin')
    const ev = await adm.collection('events').create(eventData(uid(adm)))
    const reg = await post(aluno, `/api/g/events/${ev.id}/register`)
    const { token: eventToken } = await aluno.collection('passports').getFirstListItem(`registration = "${reg.id}"`)
    await expect(post(outroProf, '/api/g/passports/lookup', { token: eventToken })).rejects.toMatchObject({ status: 403 })
    expect((await post(adm, '/api/g/passports/lookup', { token: eventToken })).kind).toBe('event')
  })

  it('mudar a grade não apaga sessão com presença', async () => {
    const { prof, cls, token } = await enrolled()
    const { training } = await post(prof, '/api/g/passports/attend', { token })
    const other = WEEKDAYS[(WEEKDAYS.indexOf(cls.weekdays[0]) + 3) % 7]
    await prof.collection('classes').update(cls.id, { weekdays: [other] })
    const ids = (await sessions(prof, cls.id)).map((t) => t.id)
    expect(ids).toContain(training.id)
    expect(ids).toHaveLength(3)
  })
})
