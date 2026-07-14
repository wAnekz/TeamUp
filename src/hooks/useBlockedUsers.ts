import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Self-serve, client-side-only block/mute: hides a user's chat messages
 * from the blocker's own view (see TeamChat.tsx). Deliberately simple —
 * this is for "I don't want to see this person's messages anymore", not a
 * safety tool on its own. Anything that needs the person actually removed
 * or sanctioned still goes through ReportButton -> the moderation queue
 * (see firestore.rules for why: a blocked user can still technically post
 * to a shared team chat they're a member of, this list just filters what
 * renders for the blocker).
 */
export function useBlockedUserIds() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setBlockedIds(new Set());
      return;
    }
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'blocks'), (snap) => {
      setBlockedIds(new Set(snap.docs.map((d) => d.id)));
    });
    return unsub;
  }, [user]);

  return blockedIds;
}

export async function blockUser(currentUid: string, targetUid: string) {
  await setDoc(doc(db, 'users', currentUid, 'blocks', targetUid), {
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(currentUid: string, targetUid: string) {
  await deleteDoc(doc(db, 'users', currentUid, 'blocks', targetUid));
}