import Link from 'next/link';
import { Button } from '../common-components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="max-w-md w-full text-center">
        <p
          className="font-black mb-4"
          style={{ fontSize: 'clamp(4rem, 15vw, 7rem)', color: '#0a6e4f', lineHeight: 1 }}
        >
          404
        </p>
        <h1 className="text-xl font-bold text-text-primary mb-2">Page not found</h1>
        <p className="text-sm text-text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button>Go back home</Button>
        </Link>
      </div>
    </div>
  );
}
