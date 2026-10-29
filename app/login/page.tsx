import type { Metadata } from "next";
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/login-form';
import { Panel } from '@/components/ui/panel';
import { CognitaMark } from '@/components/site-logo';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MotionPage } from '@/components/motion/primitives';

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sudah login -- tidak ada gunanya melihat form ini lagi.
  if (user) redirect('/');

  const { error } = await searchParams;

  return (
    <MotionPage className="flex min-h-dvh flex-col gap-2 p-2 tab:gap-3 tab:p-3">
      <SiteHeader title="Sign in" showWallet={false} />

      <div className="flex flex-1 items-center justify-center py-6">
        <div className="w-full max-w-sm">
          <Panel className="rounded-dialog">
            <div className="flex flex-col items-center gap-3 border-b border-line px-5 pb-4 pt-6 text-center">
              <CognitaMark className="size-12 drop-shadow-[0_8px_16px_rgba(29,78,216,0.35)]" />
              <div>
                <h2 className="font-display text-xl font-extrabold leading-tight">Sign in to Cognita</h2>
                <p className="mt-1 text-[12.5px] text-muted">The city of working minds</p>
              </div>
            </div>
            {error && (
              <p role="alert" className="border-b border-line bg-crit/10 px-5 py-2.5 text-[12px] text-crit">
                Sign-in didn&apos;t complete -- please try again below.
              </p>
            )}
            <LoginForm />
          </Panel>
        </div>
      </div>

      <SiteFooter />
    </MotionPage>
  );
}
