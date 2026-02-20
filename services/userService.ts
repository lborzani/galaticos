import { doc, getDoc, getDocs, updateDoc, collection, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';
import type { PlayerPosition, User } from '@/types/user.types';

export interface UpdateProfileInput {
  displayName?: string;
  position?: PlayerPosition | null;
  availableForTeam?: boolean;
  avatarUrl?: string;
}

export async function updateUserProfile(uid: string, data: UpdateProfileInput): Promise<void> {
  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.position === null) {
    payload.position = null;
  }

  await updateDoc(doc(db, 'users', uid), payload);

  if (auth.currentUser) {
    // Firebase Auth photoURL só aceita URLs HTTP — ignorar se for base64
    const isHttpUrl = data.avatarUrl?.startsWith('http');
    await updateProfile(auth.currentUser, {
      ...(data.displayName ? { displayName: data.displayName } : {}),
      ...(isHttpUrl ? { photoURL: data.avatarUrl } : {}),
    });
  }
}

// Sincroniza avatar, nome e posição nas inscrições ativas do usuário
export async function syncUserRegistrations(
  uid: string,
  data: { displayName?: string; avatarUrl?: string; playerPosition?: PlayerPosition | null },
): Promise<void> {
  const q = query(
    collection(db, 'registrations'),
    where('userId', '==', uid),
    where('status', 'in', ['confirmed', 'waitlist']),
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.displayName) payload.displayName = data.displayName;
  if (data.avatarUrl !== undefined) payload.avatarUrl = data.avatarUrl;
  if (data.playerPosition !== undefined) {
    payload.playerPosition = data.playerPosition ?? null;
  }

  snap.docs.forEach((d) => batch.update(d.ref, payload));
  await batch.commit();
}

export async function getUserPublicProfile(
  uid: string,
): Promise<Pick<User, 'uid' | 'displayName' | 'avatarUrl' | 'position'> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    displayName: d.displayName ?? '',
    avatarUrl: d.avatarUrl,
    position: d.position,
  };
}
