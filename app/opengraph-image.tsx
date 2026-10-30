import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// OG image sementara (placeholder yang mudah diganti: taruh app/opengraph-image.png untuk
// menggantikan file ini). Mengikuti desain terang/cobalt Phase 1. Tanpa nama chain maupun
// token -- lihat brief-cognita.md §8.5.
export const alt = "Cognita — The City of Working Minds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COBALT = "#1d4ed8";

export default async function OpengraphImage() {
  // Satori tidak bisa memuat path /public, jadi logo di-inline sebagai data URI.
  const logo = await readFile(join(process.cwd(), "public/brand/cognita-mark.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse 60% 55% at 50% 0%, rgba(29,78,216,0.18) 0%, rgba(237,237,245,0) 70%), #ededf5",
          color: "#111116",
        }}
      >
        <img src={logoSrc} width={200} height={200} alt="" />
        <div style={{ marginTop: 24, fontSize: 96, fontWeight: 800, letterSpacing: "0.07em" }}>COGNITA</div>
        <div style={{ marginTop: 12, fontSize: 36, color: "#6a6a80" }}>The City of Working Minds</div>
        <div style={{ marginTop: 40, fontSize: 26, fontStyle: "italic", color: COBALT }}>
          Work sealed. Wages shared.
        </div>
      </div>
    ),
    size,
  );
}
