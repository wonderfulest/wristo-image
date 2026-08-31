import { describe, expect, it } from 'vitest'
import {
  LocalImageHistoryRepository,
  type LocalImageHistoryEntry,
  type LocalImageHistoryStorage,
} from './localImageHistory'

class MemoryHistoryStorage implements LocalImageHistoryStorage {
  entries: LocalImageHistoryEntry[] = []

  async list() { return [...this.entries] }
  async put(entry: LocalImageHistoryEntry) {
    this.entries = this.entries.filter(item => item.id !== entry.id)
    this.entries.push(entry)
  }
  async delete(id: string) { this.entries = this.entries.filter(item => item.id !== id) }
  async clear() { this.entries = [] }
}

const entry = (index: number): LocalImageHistoryEntry => ({
  id: `image-${index}`,
  name: `image-${index}.png`,
  mimeType: 'image/png',
  width: 100,
  height: 100,
  createdAt: index,
  blob: new Blob([String(index)], { type: 'image/png' }),
})

describe('LocalImageHistoryRepository', () => {
  it('returns newest local images first', async () => {
    const storage = new MemoryHistoryStorage()
    storage.entries = [entry(1), entry(3), entry(2)]

    expect((await new LocalImageHistoryRepository(storage).list()).map(item => item.id))
      .toEqual(['image-3', 'image-2', 'image-1'])
  })

  it('keeps only the latest 20 images', async () => {
    const storage = new MemoryHistoryStorage()
    const repository = new LocalImageHistoryRepository(storage, 20)

    for (let index = 1; index <= 21; index += 1) await repository.save(entry(index))

    expect((await repository.list()).map(item => item.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `image-${21 - index}`),
    )
    expect(storage.entries.some(item => item.id === 'image-1')).toBe(false)
  })

  it('deletes one image or clears all local images', async () => {
    const storage = new MemoryHistoryStorage()
    storage.entries = [entry(1), entry(2)]
    const repository = new LocalImageHistoryRepository(storage)

    await repository.delete('image-1')
    expect((await repository.list()).map(item => item.id)).toEqual(['image-2'])

    await repository.clear()
    expect(await repository.list()).toEqual([])
  })
})
