import { MotionFooter } from "@/components/motion/primitives";
import { isSimulationMode } from "@/lib/identity/mode";

/** Footer bersama semua page: nama kota, tagline, motto, lalu janji escrow dan disclaimer.
 *  `children` (opsional) disisipkan di antara dua baris, mis. blok CA di Weighhouse.
 *  "Simulation only" hanya muncul saat app memang berjalan di mode simulasi. */
export function SiteFooter({ children }: { children?: React.ReactNode }) {
  return (
    <MotionFooter className="flex flex-col items-center gap-1.5 px-2 pb-1 text-center text-[11.5px] text-faint">
      <p>
        <b className="font-semibold tracking-[0.06em] text-text">COGNITA</b>
        {" · "}The City of Working Minds{" · "}
        <i>Work sealed. Wages shared.</i>
      </p>
      {children}
      <p>
        No coin leaves the Strongbox without a human seal.
        {isSimulationMode && " Simulation only, no real funds move."} Experimental software, not financial advice.
      </p>
    </MotionFooter>
  );
}
