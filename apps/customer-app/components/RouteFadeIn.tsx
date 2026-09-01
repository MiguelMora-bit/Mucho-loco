// Used from per-route template.tsx files, which Next.js remounts on every
// navigation (unlike layout.tsx, which persists) — that remount is what
// re-triggers this fade-in each time you arrive at the route.
export function RouteFadeIn({ children }: { children: React.ReactNode }) {
  return <div className="route-fade-in">{children}</div>;
}
