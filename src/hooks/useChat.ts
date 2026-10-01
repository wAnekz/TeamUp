import { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage } from '@/types';

// Firestore realtime listeners push updates on their own — no react-query
// here since there's nothing to poll or invalidate, just a live subscription
// kept in local state for the lifetime of the component.
export function useProjectChat(projectId: string | undefined, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId || !enabled) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let retried = false;
    let unsub: (() => void) | undefined;

    const subscribe = () => {
      setLoading(true);
      setError(null);
      // Newest 500, shown oldest-first: a long chat must never hide what was just sent.
      const q = query(collection(db, 'projects', projectId, 'messages'), orderBy('createdAt', 'desc'), limit(500));
      unsub = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage).reverse());
          setLoading(false);
        },
        (err) => {
          if (cancelled) return;
          // A brand-new listener can occasionally get a permission-denied
          // right after sign-in/reload — the ID token hasn't finished
          // propagating to Firestore's listen stream yet, not an actual
          // access problem. One silent retry clears this up almost every
          // time instead of scaring a legitimate team member; only shown
          // to the user if the retry also fails.
          if (!retried) {
            retried = true;
            unsub?.();
            setTimeout(() => {
              if (!cancelled) subscribe();
            }, 1200);
            return;
          }
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        },
      );
    };

    subscribe();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [projectId, enabled]);

  return { messages, loading, error };
}

export async function sendProjectMessage(input: {
  projectId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
}) {
  await addDoc(collection(db, 'projects', input.projectId, 'messages'), {
    projectId: input.projectId,
    authorId: input.authorId,
    authorName: input.authorName,
    authorAvatarUrl: input.authorAvatarUrl ?? null,
    text: input.text,
    createdAt: serverTimestamp(),
  });
}
