import { describe, expect, it } from 'vitest'
import { dataURLToBlob, fitWithin } from './image'

describe('fitWithin', () => {
  it('scales the longest side down to the max', () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 })
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 })
  })
  it('never upscales', () => {
    expect(fitWithin(400, 300, 1000)).toEqual({ width: 400, height: 300 })
  })
  it('never returns a zero side', () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 })
  })
})

describe('dataURLToBlob', () => {
  it('decodes base64 and keeps the mime type', async () => {
    const blob = dataURLToBlob('data:image/jpeg;base64,SGVsbG8=') // "Hello"
    expect(blob.type).toBe('image/jpeg')
    expect(await blob.text()).toBe('Hello')
  })
})
