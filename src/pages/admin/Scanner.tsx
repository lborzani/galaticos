import { BarcodeDetector, setZXingModuleOverrides } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime, type GEvent, type Registration } from '@/lib/events'
import { avatarUrl, initials, pb, POSITION_LABELS, serverMessage, type User } from '@/lib/pb'

// wasm servido pelo próprio app (sem CDN): funciona offline e self-hosted
setZXingModuleOverrides({ locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) })

type Lookup = { registration: Registration; event: GEvent; user: User; alreadyAttended: boolean }
type State =
  | { phase: 'scanning' }
  | { phase: 'found'; token: string; data: Lookup }
  | { phase: 'error'; message: string }

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<State>({ phase: 'scanning' })
  const [camera, setCamera] = useState<'starting' | 'on' | 'denied'>('starting')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let stream: MediaStream | undefined
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCamera('on')
      })
      .catch(() => setCamera('denied'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  const onCode = useCallback(async (token: string) => {
    try {
      const data = await pb.send<Lookup>('/api/g/passports/lookup', { method: 'POST', body: { token } })
      setState({ phase: 'found', token, data })
    } catch (err) {
      setState({ phase: 'error', message: serverMessage(err, 'Não foi possível ler esse passaporte.') })
    }
  }, [])

  // lê um quadro a cada 250 ms enquanto estiver no modo de leitura
  useEffect(() => {
    if (camera !== 'on' || state.phase !== 'scanning') return
    const detector = new BarcodeDetector({ formats: ['qr_code'] })
    let stop = false
    const tick = async () => {
      const video = videoRef.current
      if (stop || !video) return
      try {
        const [code] = video.readyState >= 2 ? await detector.detect(video) : []
        if (code?.rawValue && !stop) return void onCode(code.rawValue)
      } catch { /* quadro ruim; tenta o próximo */ }
      if (!stop) setTimeout(tick, 250)
    }
    tick()
    return () => { stop = true }
  }, [camera, state.phase, onCode])

  async function confirm() {
    if (state.phase !== 'found') return
    setBusy(true)
    try {
      await pb.send('/api/g/passports/attend', { method: 'POST', body: { token: state.token } })
      toast.success(`Presença de ${state.data.user.name} confirmada`)
      setState({ phase: 'scanning' })
    } catch (err) {
      setState({ phase: 'error', message: serverMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const next = () => setState({ phase: 'scanning' })

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Validar passaportes</h1>

      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" aria-label="Câmera" />
        {camera === 'denied' && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">
            Sem acesso à câmera. Libere a permissão no navegador e recarregue a página.
          </p>
        )}
        {camera === 'on' && state.phase === 'scanning' && (
          <div className="pointer-events-none absolute inset-10 rounded-xl border-2 border-white/70" aria-hidden />
        )}
      </div>

      {state.phase === 'scanning' && camera === 'on' && <p className="text-center text-sm text-muted-foreground">Aponte para o QR do passaporte.</p>}

      {state.phase === 'error' && (
        <Card className="border-destructive/40" role="alert">
          <CardContent className="grid gap-4">
            <p className="flex items-center gap-2 font-medium text-destructive"><TriangleAlert className="size-5" /> {state.message}</p>
            <Button onClick={next}>Ler outro</Button>
          </CardContent>
        </Card>
      )}

      {state.phase === 'found' && (
        <Card role="status">
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={avatarUrl(state.data.user, '400x400')} alt="" className="object-cover" />
                <AvatarFallback>{initials(state.data.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{state.data.user.name}</p>
                {state.data.user.position && <p className="text-sm text-muted-foreground">{POSITION_LABELS[state.data.user.position]}</p>}
                <p className="text-sm text-muted-foreground">{state.data.event.title} · {formatDateTime(state.data.event.eventDate)}</p>
              </div>
            </div>
            {state.data.alreadyAttended ? (
              <>
                <p className="flex items-center gap-2 font-medium text-amber-500"><CircleCheck className="size-5" /> Já estava presente</p>
                <Button onClick={next}>Ler outro</Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={next}>Cancelar</Button>
                <Button className="flex-1" disabled={busy} onClick={confirm}>Confirmar presença</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
