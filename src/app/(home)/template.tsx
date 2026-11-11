// Re-runs on every navigation, so the page-wipe transition replays each time.
import PageTransition from "@/src/components/page-transition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
