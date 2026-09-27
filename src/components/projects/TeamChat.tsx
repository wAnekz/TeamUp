import { useEffect, useRef, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { Send, UserX, UserCheck } from 'lucide-react';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectChat, sendProjectMessage } from '@/hooks/useChat';
import { blockUser, unblockUser, useBlockedUserIds } from '@/hooks/useBlockedUsers';
import { cn } from '@/utils/cn';
import { useT } from '@/i18n';

const MAX_LENGTH = 1000;

function messageTime(ts: Timestamp | undefined) {
  if (!ts) return '';
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TeamChat({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const { user, profile } = useAuth();
  const t = useT().chat;
  const { messages: allMessages, loading, error } = useProjectChat(projectId, enabled);
  const blockedIds = useBlockedUserIds();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hiddenCount = allMessages.filter((m) => blockedIds.has(m.authorId)).length;
  const messages = showBlocked ? allMessages : allMessages.filter((m) => !blockedIds.has(m.authorId));

  const toggleBlock = (authorId: string, authorName: string) => {
    if (!user) return;
    if (blockedIds.has(authorId)) {
      unblockUser(user.uid, authorId);
      return;
    }
    // Confirm before blocking, same pattern as the moderator "ban" action
    // in Reports.tsx — this hides them everywhere you'd see their
    // messages, so worth a beat before committing to it.
    if (confirm(t.confirmBlock(authorName))) {
      blockUser(user.uid, authorId);
    }
  };
  // Cheap client-side throttle: blocks accidental double-sends and casual
  // flooding through the UI. Not a substitute for real server-side rate
  // limiting (see the Cloud Function in functions/src/moderation.ts) — a
  // script hitting the Firestore API directly can ignore this — but it
  // covers the common case for free, no Blaze plan required.
  const lastSentAtRef = useRef(0);
  const MIN_INTERVAL_MS = 1200;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!enabled) return null;

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !profile || sending) return;
    if (Date.now() - lastSentAtRef.current < MIN_INTERVAL_MS) return;
    setSending(true);
    setSendError(false);
    try {
      await sendProjectMessage({
        projectId,
        authorId: user.uid,
        authorName: profile.name,
        authorAvatarUrl: profile.avatarUrl,
        text: trimmed,
      });
      lastSentAtRef.current = Date.now();
      setText('');
    } catch {
      // Message stays in the input so nothing typed is lost, and the error
      // banner below tells the user it didn't go through instead of the
      // previous silent failure.
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-surface-900">{t.title}</h2>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card">
        <div className="max-h-96 min-h-[220px] space-y-3 overflow-y-auto p-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              <p>{t.loadError}</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-1 font-medium underline">
                {t.reload}
              </button>
            </div>
          )}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="ml-auto h-10 w-2/3" />
            </div>
          )}
          {!loading && !error && messages.length === 0 && hiddenCount === 0 && (
            <p className="text-center text-sm text-surface-400">{t.empty}</p>
          )}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowBlocked((v) => !v)}
              className="w-full rounded-xl border border-dashed border-surface-200 py-1.5 text-center text-xs text-surface-400 hover:text-surface-600"
            >
              {showBlocked ? t.hideBlocked : t.hiddenCount(hiddenCount)}
            </button>
          )}
          {messages.map((m) => {
            const mine = m.authorId === user?.uid;
            const isBlocked = blockedIds.has(m.authorId);
            return (
              <div key={m.id} className={cn('group flex items-end gap-2', mine && 'flex-row-reverse')}>
                <Avatar src={m.authorAvatarUrl} name={m.authorName} size={28} />
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                    mine ? 'bg-accent-600 text-white' : 'bg-surface-100 text-surface-800',
                    !mine && isBlocked && 'opacity-50',
                  )}
                >
                  {!mine && <p className="mb-0.5 text-xs font-medium text-surface-500">{m.authorName}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={cn('mt-1 text-right text-[10px]', mine ? 'text-accent-100' : 'text-surface-400')}>
                    {messageTime(m.createdAt)}
                  </p>
                </div>
                {!mine && (
                  <button
                    type="button"
                    onClick={() => toggleBlock(m.authorId, m.authorName)}
                    aria-label={isBlocked ? t.unblock(m.authorName) : t.block(m.authorName)}
                    title={isBlocked ? t.unblock(m.authorName) : t.block(m.authorName)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-surface-300 opacity-0 transition hover:bg-surface-100 hover:text-surface-600 group-hover:opacity-100"
                  >
                    {isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
                  </button>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {sendError && (
          <p className="border-t border-surface-100 bg-red-50 px-4 py-1.5 text-xs text-red-600">
            {t.sendFailed}
          </p>
        )}
        <div className="flex items-center gap-2 border-t border-surface-100 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t.placeholder}
            className="flex-1 rounded-xl border border-surface-200 px-3.5 py-2 text-sm focus:border-accent-500"
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || sending}
            aria-label={t.send}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}