import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", alignItems: "center", color: "#f7f2df", background: "radial-gradient(circle at 72% 42%, #28533a 0%, #0b1c12 28%, #030504 69%)", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", inset: 28, display: "flex", border: "2px solid rgba(231,189,77,.4)", borderRadius: 28 }} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 82 }}>
        <div style={{ color: "#e7bd4d", fontSize: 22, letterSpacing: 8 }}>THE WORLD CUP XI SIMULATOR</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 35, fontSize: 84, fontWeight: 750, letterSpacing: -5, lineHeight: .92 }}>
          <span>BUILD THE XI.</span>
          <span style={{ color: "#e7bd4d" }}>BEAT HISTORY.</span>
        </div>
        <div style={{ width: 700, marginTop: 35, color: "#a8b2ab", fontSize: 26, lineHeight: 1.4 }}>Draft tournament legends. Shape one timeless squad. Challenge the World Cup champions.</div>
      </div>
      <div style={{ position: "absolute", right: 83, bottom: 62, display: "flex", color: "rgba(231,189,77,.16)", fontSize: 190, fontWeight: 800, letterSpacing: -20 }}>XI</div>
    </div>,
    size,
  );
}
