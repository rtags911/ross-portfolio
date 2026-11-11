import { ImageResponse } from "next/og";

import { profile } from "@/src/content/profile";

// Link-preview image, generated from profile.ts (no file to keep in sync).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${profile.name}, ${profile.role}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "#0d1014", color: "#e9e5da" }}>
        <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1, color: "#e3a33a" }}>{profile.heroTitle[0]}</div>
        <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1 }}>{profile.heroTitle[1]}</div>
        <div style={{ marginTop: 40, fontSize: 36, color: "#8d8a82" }}>{`${profile.name} · ${profile.alias}`}</div>
      </div>
    ),
    size
  );
}
