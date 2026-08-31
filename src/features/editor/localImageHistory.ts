export type LocalImageHistoryEntry = {
  id: string
  name: string
  mimeType: string
  width: number
  height: number
  createdAt: number
  blob: Blob
}

export interface LocalImageHistoryStorage {
  list(): Promise<LocalImageHistoryEntry[]>
  put(entry: LocalImageHistoryEntry): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

export class LocalImageHistoryRepository {
  constructor(
    private readonly storage: LocalImageHistoryStorage,
    private readonly limit = 50,
  ) {}

  async list(): Promise<LocalImageHistoryEntry[]> {
    return (await this.storage.list()).sort((left, right) => right.createdAt - left.createdAt)
  }

  async save(entry: LocalImageHistoryEntry): Promise<void> {
    await this.storage.put(entry)
    const overflow = (await this.list()).slice(this.limit)
    await Promise.all(overflow.map(item => this.storage.delete(item.id)))
  }

  delete(id: string): Promise<void> {
    return this.storage.delete(id)
  }

  clear(): Promise<void> {
    return this.storage.clear()
  }
}

const DATABASE_NAME = 'wristo-image-local-history'
const DATABASE_VERSION = 1
const STORE_NAME = 'images'

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法访问本地图片历史。'))
  })

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开本地图片历史。'))
  })

export class IndexedDbImageHistoryStorage implements LocalImageHistoryStorage {
  private databasePromise: Promise<IDBDatabase> | null = null

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= openDatabase()
    return this.databasePromise
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.database()).transaction(STORE_NAME, mode).objectStore(STORE_NAME)
  }

  async list(): Promise<LocalImageHistoryEntry[]> {
    return requestResult((await this.store('readonly')).getAll())
  }

  async put(entry: LocalImageHistoryEntry): Promise<void> {
    await requestResult((await this.store('readwrite')).put(entry))
  }

  async delete(id: string): Promise<void> {
    await requestResult((await this.store('readwrite')).delete(id))
  }

  async clear(): Promise<void> {
    await requestResult((await this.store('readwrite')).clear())
  }
}

export const createLocalImageHistoryRepository = (): LocalImageHistoryRepository | null =>
  typeof window.indexedDB === 'undefined'
    ? null
    : new LocalImageHistoryRepository(new IndexedDbImageHistoryStorage())
