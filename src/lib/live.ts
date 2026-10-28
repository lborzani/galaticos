import type { RecordModel } from 'pocketbase'
import { useEffect, useState } from 'react'
import { pb } from './pb'

type Live<T> = { data: T | undefined; error: boolean }

// ponytail: recarrega a consulta inteira a cada mudança na collection; trocar por merge incremental se as listas crescerem muito.
/** Lista com atualização em tempo real (realtime do PocketBase). */
export function useLiveList<T extends RecordModel>(collection: string, opts: { filter?: string; sort?: string; expand?: string } = {}): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>({ data: undefined, error: false })
  const { filter, sort, expand } = opts

  useEffect(() => {
    let alive = true
    const load = () =>
      pb.collection(collection).getFullList<T>({ filter, sort, expand, requestKey: null })
        .then((data) => alive && setState({ data, error: false }))
        .catch(() => alive && setState((s) => ({ ...s, error: true })))
    load()
    const unsub = pb.collection(collection).subscribe('*', load)
    return () => {
      alive = false
      unsub.then((u) => u()).catch(() => {})
    }
  }, [collection, filter, sort, expand])

  return state
}

/** Um registro com atualização em tempo real; `data === null` quando não existe. */
export function useLiveRecord<T extends RecordModel>(collection: string, id: string, expand?: string): Live<T | null> {
  const [state, setState] = useState<Live<T | null>>({ data: undefined, error: false })

  useEffect(() => {
    let alive = true
    const load = () =>
      pb.collection(collection).getOne<T>(id, { expand, requestKey: null })
        .then((data) => alive && setState({ data, error: false }))
        .catch((err) => alive && setState(err?.status === 404 ? { data: null, error: false } : (s) => ({ ...s, error: true })))
    load()
    const unsub = pb.collection(collection).subscribe(id, load)
    return () => {
      alive = false
      unsub.then((u) => u()).catch(() => {})
    }
  }, [collection, id, expand])

  return state
}
