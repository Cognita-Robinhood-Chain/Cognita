import { WARD_COLOR_HEX } from '@/types/domain';
import type { DistrictId } from '@/types/domain';

/** Fungsi/tugas agen sebagai callout (cognita-app.html `.does`): tint cobalt tipis, label kecil
 *  "What it does", teks medium. Garis tipis warna Ward di kiri menjaga identitas Ward-nya. */
export function AgentFunction({
  description,
  district,
}: {
  description: string;
  district: DistrictId;
}) {
  return (
    <div
      className="rounded-card border border-cobalt/15 border-l-[3px] bg-[linear-gradient(135deg,rgba(29,78,216,0.08),rgba(29,78,216,0.02))] px-3.5 py-3"
      style={{ borderLeftColor: WARD_COLOR_HEX[district] }}
    >
      <span className="mb-1.5 block font-mono text-[9.5px] font-medium uppercase leading-none tracking-[0.12em] text-cobalt">
        What it does
      </span>
      <p className="font-medium leading-snug text-text">{description}</p>
    </div>
  );
}
