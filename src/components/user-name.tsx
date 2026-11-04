import type { User } from '@/lib/pb'

/** Nome com o apelido entre aspas, quando houver. */
export function UserName({ user, fallback = 'Jogador' }: { user?: Pick<User, 'name' | 'nickname'> | null; fallback?: string }) {
  if (!user) return <>{fallback}</>
  return <>{user.name}{user.nickname && <span className="text-muted-foreground"> “{user.nickname}”</span>}</>
}

/** Texto para busca por nome ou apelido. */
export const userSearchText = (u: Pick<User, 'name' | 'nickname'>) => `${u.name} ${u.nickname ?? ''}`.toLowerCase()
