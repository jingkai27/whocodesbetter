'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Swords, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken, checkAuth } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/login?error=${error}`);
      return;
    }

    if (token) {
      setAccessToken(token);
      checkAuth().then(() => {
        router.push('/dashboard');
      });
    } else {
      router.push('/login');
    }
  }, [searchParams, setAccessToken, checkAuth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Swords className="mx-auto h-12 w-12 text-primary-500" />
        <h1 className="mt-4 text-xl font-semibold">Completing sign in...</h1>
        <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin text-muted" />
      </div>
    </div>
  );
}
