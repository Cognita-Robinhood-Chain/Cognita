import { ImageResponse } from "next/og";
import { MARK } from "@/components/site-logo";

// OG image sementara (placeholder yang mudah diganti: taruh app/opengraph-image.png untuk
// menggantikan file ini). Mengikuti desain terang/cobalt Phase 1. Tanpa nama chain maupun
// token -- lihat brief-cognita.md §8.5.
export const alt = "Cognita — The City of Working Minds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COBALT = "#1d4ed8";

export default function OpengraphImage() {
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
        <svg width="168" height="168" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={MARK.gradient[0]} />
              <stop offset="1" stopColor={MARK.gradient[1]} />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="url(#g)" />
          <path d={MARK.arc} fill="none" stroke={MARK.light} strokeWidth={MARK.arcWidth} strokeLinecap="round" />
          <circle cx={MARK.core.cx} cy={MARK.core.cy} r={MARK.core.r} fill={MARK.light} />
          <circle cx={MARK.satellite.cx} cy={MARK.satellite.cy} r={MARK.satellite.r} fill={MARK.light} />
        </svg>
        <div style={{ marginTop: 36, fontSize: 96, fontWeight: 800, letterSpacing: "0.07em" }}>COGNITA</div>
        <div style={{ marginTop: 12, fontSize: 36, color: "#6a6a80" }}>The City of Working Minds</div>
        <div style={{ marginTop: 40, fontSize: 26, fontStyle: "italic", color: COBALT }}>
          Work sealed. Wages shared.
        </div>
      </div>
    ),
    size,
  );
}
