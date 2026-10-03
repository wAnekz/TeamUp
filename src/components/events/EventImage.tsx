import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import { safeUrl } from '@/utils/safeUrl';

/**
 * Event thumbnails are mostly organisers' logos, often transparent PNGs drawn
 * for a white page. They always sit on white (also in dark mode, where a dark
 * logo would vanish), and a missing or broken image becomes an icon tile.
 */
export function EventImage({
  src,
  className,
  fit = 'cover',
}: {
  src?: string | null;
  className?: string;
  /** "contain" keeps wide logos whole instead of cropping their text. */
  fit?: 'cover' | 'contain';
}) {
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
      <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className={cn('h-full w-full', fit === 'contain' ? 'object-contain p-2' : 'object-cover')} />
    </div>
  );
}
