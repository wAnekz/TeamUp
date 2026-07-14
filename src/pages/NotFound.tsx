import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-bold text-surface-900">Page not found</h1>
      <p className="text-surface-500">This page doesn't exist, or the link is broken.</p>
      <Link to="/feed">
        <Button className="mt-2">Back to projects</Button>
      </Link>
    </div>
  );
}
