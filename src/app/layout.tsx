// Root shell for every page: fonts, smooth scrolling (Lenis), providers, and the page title / link previews built from profile.json.
import { Analytics } from "@vercel/analytics/next";
import "lenis/dist/lenis.css";
import { ReactLenis } from "lenis/react";
import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Josefin_Sans } from "next/font/google";
import { headers } from "next/headers";

import Providers from "@/src/providers/providers";
import { profile } from "@/src/content/profile";
import "@/src/styles/globals.css";

const josefin = Josefin_Sans({
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || new URL(profile.siteUrl).host;
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return {
    title: {
      template: `${profile.alias} | %s`,
      default: `${profile.alias} | ${profile.role}`,
    },
    description:
      profile.description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: `${profile.alias} | ${profile.role}`,
      description:
        profile.description,
      url: "/",
      siteName: profile.alias,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.alias} | ${profile.role}`,
      description:
        profile.description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: browser extensions add their own attributes to <html> (e.g. crxlauncher); ignore those.
    // It only covers this one tag, not the page inside it.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${josefin.className} ${jetbrainsMono.variable} ${anton.variable} relative bg-black text-white antialiased select-none`}
      >
        <ReactLenis
          root
          options={{
            lerp: 0.1,
            duration: 1.4,
          }}
        >
          <main>
            <Providers>{children}</Providers>
          </main>
        </ReactLenis>
        <Analytics />
      </body>
    </html>
  );
}
