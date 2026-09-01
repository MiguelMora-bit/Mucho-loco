import { RouteFadeIn } from '@/components/RouteFadeIn';

// Scoped to this leaf route (not the (account) group layout) so the shared
// Sidebar in (account)/layout.tsx keeps surviving dashboard <-> performance
// navigation instead of remounting on every switch.
export default function Template({ children }: { children: React.ReactNode }) {
  return <RouteFadeIn>{children}</RouteFadeIn>;
}
