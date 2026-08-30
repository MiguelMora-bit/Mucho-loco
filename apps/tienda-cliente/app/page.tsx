// Superseded at runtime by app/[locale]/page.tsx via next-intl middleware.
// force-dynamic prevents static prerender so no next-intl context is required.
export const dynamic = 'force-dynamic';
export default function RootPage() { return <></>; }
