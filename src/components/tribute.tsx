import { useRef, useState, type ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const TAPS = 5
const WINDOW_MS = 2000

/** Easter egg: 5 toques rápidos no logo abrem a homenagem ao Well (Wellington), que ajudou a criar o app. */
export function Tribute({ children }: { children: ReactNode }) {
  const taps = useRef<number[]>([])
  const [open, setOpen] = useState(false)

  function tap() {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now]
    if (taps.current.length < TAPS) return
    taps.current = []
    setOpen(true)
  }

  return (
    <>
      <span className="contents" onClick={tap}>{children}</span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="overflow-hidden p-0 gap-0">
          <img src="/well.webp" alt="Well sorrindo, com a camisa do Galáticos e a bola na mão"
            className="aspect-4/5 max-h-[55dvh] w-full object-cover object-top" />
          <AlertDialogHeader className="p-5 place-items-center! text-center!">
            <AlertDialogTitle className="text-xl font-black">Em memória de Well 💜</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              Wellington, o nosso Well. Acreditava imensamente no time e no projeto do Galáticos, e ajudou a idealizar este app.
              Um grande amigo, parceiro e incentivador.
              Cada jogo marcado aqui tem um pouco de você. Obrigado por tudo, Well.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="m-0 sm:justify-center">
            <AlertDialogAction>Valeu, Well</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
