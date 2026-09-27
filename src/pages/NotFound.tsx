import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';

export default function NotFound() {
  const t = useT().errors;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-bold text-surface-900">{t.notFound}</h1>
      <p className="text-surface-500">{t.notFoundText}</p>
      <Link to="/feed">
        <Button className="mt-2">{t.backToProjects}</Button>
      </Link>
    </div>
  );
}
