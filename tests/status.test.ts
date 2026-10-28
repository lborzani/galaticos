import { describe, expect, it } from 'vitest'
import { deriveStatus, type GEvent } from '@/lib/events'

const now = new Date('2026-11-01T12:00:00Z')
const at = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString().replace('T', ' ')
const ev = (over: Partial<GEvent>) => ({ eventDate: at(24), registrationOpensAt: at(-1), maxParticipants: 3, confirmedCount: 0, cancelledAt: '', ...over }) as GEvent

describe('deriveStatus', () => {
  it.each([
    ['upcoming', ev({ registrationOpensAt: at(1) })],
    ['open', ev({ confirmedCount: 2 })],
    ['full', ev({ confirmedCount: 3 })],
    ['in_progress', ev({ eventDate: at(-1), registrationOpensAt: at(-5) })],
    ['finished', ev({ eventDate: at(-4), registrationOpensAt: at(-9) })],
    ['cancelled', ev({ cancelledAt: at(-2) })],
  ] as const)('%s', (expected, event) => {
    expect(deriveStatus(event, now)).toBe(expected)
  })
})
