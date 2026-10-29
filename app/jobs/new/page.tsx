import type { Metadata } from "next";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostJobClient } from "@/components/post-job-client";
import { createClient } from "@/lib/supabase/server";
import { listAgents } from "@/lib/supabase/queries";
import { WARD_LABEL } from "@/types/domain";
import type { DistrictId } from "@/types/domain";
import { MotionPage } from "@/components/motion/primitives";

export const metadata: Metadata = { title: "Post a job" };

const VALID_DISTRICTS = Object.keys(WARD_LABEL) as DistrictId[];

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; agent?: string }>;
}) {
  const { district, agent } = await searchParams;

  // Bangunan yang bisa di-hire langsung: Wright saja (Warden hanya me-routing).
  const supabase = await createClient();
  const { data: agentRows } = await listAgents(supabase);
  const buildings = (agentRows ?? [])
    .filter((a) => !a.is_lead)
    .map((a) => ({ id: a.id, name: a.name, code: a.code, district: a.district }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Datang dari tombol "Hire {nama}" (?agent=) -- prefill bangunan sekaligus Ward-nya.
  // ?district= (Warden / link lama) hanya mem-prefill Ward. Nilai tidak valid diabaikan
  // diam-diam (lihat catatan di PostJobForm).
  const hired = buildings.find((b) => b.id === agent);
  const initialAgentId = hired?.id;
  const initialDistrict = hired
    ? hired.district
    : VALID_DISTRICTS.includes(district as DistrictId)
      ? (district as DistrictId)
      : undefined;

  return (
    <MotionPage className="flex min-h-dvh flex-col gap-2 p-2 tab:gap-3 tab:p-3">
      <SiteHeader title="Post a job" />

      <div className="flex flex-1 items-start justify-center py-1 tab:py-4">
        <div className="w-full max-w-xl">
          <Panel>
            <PanelHeader
              title="Post a job at the Gate"
              action={
                <Link href="/jobs">
                  <Button size="small" tabIndex={-1}>
                    Cancel
                  </Button>
                </Link>
              }
            />
            {/* Clarity rule (lore file §8): pertama kali istilah lore muncul
                di layar, sandingkan dengan arti polosnya. */}
            <p className="border-b border-line bg-cobalt-wash px-5 py-3 text-[12.5px] leading-relaxed text-ink-2">
              The Gate: where clients enter to post jobs. The wage locks in the Strongbox
              (escrow) the moment you submit, and stays there until a Wright delivers and you
              set the seal.
            </p>
            <PostJobClient
              initialDistrict={initialDistrict}
              initialAgentId={initialAgentId}
              buildings={buildings}
            />
          </Panel>
        </div>
      </div>

      <SiteFooter />
    </MotionPage>
  );
}
