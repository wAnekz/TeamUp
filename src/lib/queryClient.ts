import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast, errorToMessage } from '@/lib/toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  // Global backstop: before this, a mutation that failed with no local
  // try/catch or onError just... stopped. The button quit spinning, nothing
  // else happened, and the person had no way to tell "it didn't save" from
  // "it saved and nothing changed visually" (e.g. Close recruitment, Accept
  // application, Archive). Any mutation can still set its own onError for a
  // more specific message; this only fires when nothing more specific ran.
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return; // that mutation already handled it
      toast.error(errorToMessage(error));
    },
  }),
});
