// Movido a @mucho-loco/types (2026-09-12) — backend también necesita este
// contrato ahora que el dominio `social` se migró ahí. Re-export para no
// tocar los ~13 importadores existentes en este app.
export type { SocialNetwork, SocialLink, FeedPost } from '@mucho-loco/types';
