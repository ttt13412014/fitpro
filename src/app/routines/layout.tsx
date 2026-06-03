import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileHeader } from '@/components/layout/MobileHeader';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* Sidebar: solo desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header móvil */}
        <div className="lg:hidden">
          <MobileHeader />
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">
          {/* Padding bottom en mobile para bottom nav */}
          <div className="max-w-6xl mx-auto p-4 lg:p-6 pb-24 lg:pb-6">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom nav: solo mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
