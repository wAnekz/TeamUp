import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import { safeUrl } from '@/utils/safeUrl';

/**
 * Event thumbnails are mostly organisers' logos, often transparent PNGs drawn
 * for a white page. They always sit on white (also in dark mode, where a dark
 * logo would vanish), and a missing or broken image becomes an icon tile.
 */
export function EventImage({ src, className }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = safeUrl(src);
  if (!url || failed) {
    return (
      <div aria-hidden className={cn('flex items-center justify-center rounded-xl bg-accent-50 text-accent-600', className)}>
        <Calendar size={24} />
      </div>
    );
  }
  return (
    <div className={cn('event-image-backdrop overflow-hidden rounded-xl', className)}>
      <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
    </div>
  );
}
