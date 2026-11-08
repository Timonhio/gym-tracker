import { describe, expect, it } from 'vitest'
import { LIB_MUSCLES, bodyMapData } from './bodymap'
import { MUSCLE_GROUPS } from './types'

describe('bodyMapData', () => {
  it('maps every muscle group to at least one shape', () => {
    for (const g of MUSCLE_GROUPS) expect(LIB_MUSCLES[g].length).toBeGreaterThan(0)
  })

  it('is empty without muscles', () => {
    expect(bodyMapData([], [])).toEqual([])
  })

  it('marks primary targets with frequency 2 and assisting muscles with 1', () => {
    const data = bodyMapData(['Chest'], ['Triceps', 'Shoulders'])
    expect(data).toEqual([
      { name: 'primary', muscles: ['chest'], frequency: 2 },
      { name: 'assisting', muscles: ['triceps', 'front-deltoids', 'back-deltoids'], frequency: 1 },
    ])
  })

  it('lights up every shape of a group (abs include obliques, back has two parts)', () => {
    expect(bodyMapData(['Abs'], [])[0].muscles).toEqual(['abs', 'obliques'])
    expect(bodyMapData(['Back'], [])[0].muscles).toEqual(['upper-back', 'lower-back'])
  })

  it('keeps traps and neck apart from the back', () => {
    expect(bodyMapData(['Traps'], [])[0].muscles).toEqual(['trapezius'])
    expect(bodyMapData(['Neck'], [])[0].muscles).toEqual(['neck'])
    expect(bodyMapData(['Back'], [])[0].muscles).not.toContain('trapezius')
  })

  it('never shows a primary shape as merely assisting', () => {
    const data = bodyMapData(['Chest', 'Triceps'], ['Triceps', 'Shoulders'])
    const assisting = data.find((d) => d.name === 'assisting')
    expect(assisting?.muscles).not.toContain('triceps')
    expect(data.find((d) => d.name === 'primary')?.muscles).toContain('triceps')
  })

  it('has no duplicate shapes', () => {
    const muscles = bodyMapData(['Quads', 'Quads'], [])[0].muscles
    expect(new Set(muscles).size).toBe(muscles.length)
  })
})
