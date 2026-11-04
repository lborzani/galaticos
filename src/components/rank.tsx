import { Badge } from '@/components/ui/badge'
import { RANK_LABELS, type Rank } from '@/lib/pb'

const RANK_STYLE: Partial<Record<Rank, string>> = {
  mitico: 'border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  lendario: 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300',
}

/** Selo de Mítico/Lendário; Regular (a maioria) não leva selo. */
export function RankBadge({ rank }: { rank?: Rank }) {
  const style = rank && RANK_STYLE[rank]
  return style ? <Badge variant="outline" className={`shrink-0 ${style}`}>{RANK_LABELS[rank]}</Badge> : null
}

/** Checkboxes de "quem pode jogar"; nenhum marcado = todos. */
export function RanksField({ value, onChange }: { value: Rank[]; onChange: (v: Rank[]) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Quem pode jogar</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {(Object.keys(RANK_LABELS) as Rank[]).map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={value.includes(r)}
              onChange={(e) => onChange(e.target.checked ? [...value, r] : value.filter((x) => x !== r))} />
            {RANK_LABELS[r]}
          </label>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">Nenhum marcado: todos podem jogar.</span>
    </fieldset>
  )
}
