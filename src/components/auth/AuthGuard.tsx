'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        // getUser()는 서버에서 검증된 사용자 정보를 반환 (getSession보다 안전)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const currentPath = pathname || '';

        const isAuthPage = currentPath.startsWith('/auth');

        if (!currentUser) {
          if (!isAuthPage && currentPath !== '/') {
            router.replace('/auth');
            return;
          }
        } else {
          if (currentPath === '/') {
            const role = currentUser.user_metadata?.role || 'student';
            const target = role === 'teacher' ? '/teacher' : '/student';
            router.replace(target);
            return;
          }
        }

        setUser(currentUser ?? null);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // 로그아웃 등의 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      const currentPath = window.location.pathname;

      if (!session && currentPath !== '/auth' && currentPath !== '/') {
        router.replace('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, supabase.auth]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
