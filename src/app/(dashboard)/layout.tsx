import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClientWrapper from '@/components/shared/DashboardClientWrapper';
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const cookieStore = await cookies();
  
  // BYPASS DE AUDITORIA: Permite que o Playwright teste a UI em ambiente local
  const isTestBypass = process.env.NODE_ENV === 'development' && cookieStore.get('test-bypass')?.value === 'true';

  if (!session && !isTestBypass) {
    redirect('/login');
  }

  return (
    <DashboardClientWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container mx-auto p-4 md:p-8 flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </DashboardClientWrapper>
  );
}
