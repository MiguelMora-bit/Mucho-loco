import type { ReactNode } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import type { Lang, Translations } from '@mucho-loco/types';

interface ContactProps {
  t: Translations;
  lang: Lang;
}

const SOCIALS = [
  {
    key: 'instagram', name: 'Instagram', handle: '@mucholoco.fit', followers: '128K', url: '#',
    icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" /></svg>,
  },
  {
    key: 'tiktok', name: 'TikTok', handle: '@mucholoco', followers: '342K', url: '#',
    icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.59-2.59 2.59 2.59 0 0 1 3.45-2.44V9.7a5.66 5.66 0 0 0-.86-.07A5.69 5.69 0 1 0 14.95 15V8.86a7.33 7.33 0 0 0 4.28 1.37V7.14a4.28 4.28 0 0 1-2.63-1.32z" /></svg>,
  },
  {
    key: 'youtube', name: 'YouTube', handle: 'Mucho Loco Gym', followers: '56K', url: '#',
    icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.4.55A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.55 9.4.55 9.4.55s7.5 0 9.4-.55a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z" /></svg>,
  },
  {
    key: 'facebook', name: 'Facebook', handle: '/mucholocogym', followers: '89K', url: '#',
    icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" /></svg>,
  },
];

const FEED = [
  { net: 'instagram', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=500&q=70', cap: 'Leg day no perdona 🔥 Roma Sur a tope', likes: '2.4K', ago: '3h', url: '#' },
  { net: 'instagram', img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=500&q=70', cap: 'Nueva clase de HIIT en Condesa 💥', likes: '1.8K', ago: '9h', url: '#' },
  { net: 'facebook', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=500&q=70', cap: 'Reto de 30 días: ¿te atreves, bestia?', likes: '973', ago: '1d', url: '#' },
  { net: 'instagram', img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=70', cap: 'PR de peso muerto en Santa Fe 🏋️', likes: '3.1K', ago: '1d', url: '#' },
  { net: 'facebook', img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=500&q=70', cap: 'Coaches nuevos en Interlomas. Bienvenidos 🐂', likes: '654', ago: '2d', url: '#' },
  { net: 'instagram', img: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=500&q=70', cap: 'Domingo de cardio al aire libre ☀️', likes: '2.0K', ago: '3d', url: '#' },
];

const NET_ICON: Record<string, ReactNode> = {
  instagram: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" /></svg>,
  facebook: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" /></svg>,
};

export function Contact({ t, lang }: ContactProps) {
  return (
    <section className="contact" id="contact">
      <div className="section-head">
        <div className="section-eyebrow">{t.contact.eyebrow}</div>
        <h2 className="section-title">{t.contact.titleA} <span className="red">{t.contact.titleB}</span></h2>
        <p className="section-sub">{t.contact.sub}</p>
      </div>
      <div className="contact-stack">
        <div className="free-visit">
          <div className="fv-badge"><span className="fv-badge-big">GRATIS</span><span className="fv-badge-small">{lang === 'es' ? '1ª VISITA' : '1ST VISIT'}</span></div>
          <div className="fv-body">
            <h3>{lang === 'es' ? 'TU PRIMERA VISITA ES GRATIS' : 'YOUR FIRST VISIT IS FREE'}</h3>
            <p>{lang === 'es'
              ? 'Entra a entrenar a cualquiera de las 15 sucursales, sin costo. El sistema lo detecta automáticamente cuando tu cuenta es nueva y nunca has tenido una membresía activa — sin tarjeta, sin compromiso.'
              : "Train at any of our 15 locations, on the house. The system detects it automatically when your account is new and you've never had an active membership — no card, no commitment."}</p>
            <div className="fv-actions">
              <Link href="/account" className="btn-primary">{lang === 'es' ? 'CREAR CUENTA GRATIS' : 'CREATE FREE ACCOUNT'}</Link>
              <span className="fv-note">{lang === 'es' ? 'Detección automática · 1 visita por persona' : 'Auto-detected · 1 visit per person'}</span>
            </div>
          </div>
          <div className="fv-steps">
            <div className="fv-step"><span className="fv-step-n">01</span><span>{lang === 'es' ? 'Creas tu cuenta' : 'Create your account'}</span></div>
            <div className="fv-step"><span className="fv-step-n">02</span><span>{lang === 'es' ? 'El sistema valida que eres nuevo' : "System verifies you're new"}</span></div>
            <div className="fv-step"><span className="fv-step-n">03</span><span>{lang === 'es' ? 'Muestras tu QR en recepción' : 'Show your QR at the front desk'}</span></div>
          </div>
        </div>
        <div className="social-feed">
          <div className="sf-head">
            <span className="info-label">{lang === 'es' ? 'Lo último que publicamos' : 'Our latest posts'}</span>
            <span className="feed-live"><i className="sf-dot"></i>{lang === 'es' ? 'En vivo vía API' : 'Live via API'}</span>
          </div>
          <div className="feed-grid">
            {FEED.map((p, i) => (
              <a key={i} className="feed-post" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={p.cap}>
                <Image src={p.img} alt={p.cap} fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover" />
                <span className={'feed-net ' + p.net}>{NET_ICON[p.net]}</span>
                <span className="feed-overlay">
                  <span className="feed-cap">{p.cap}</span>
                  <span className="feed-meta"><span>❤ {p.likes}</span><span>{p.ago}</span></span>
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className="social-follow social-full">
          <div className="sf-head">
            <span className="info-label">{t.contact.followUs}</span>
            <span className="sf-daily"><i className="sf-dot"></i>{lang === 'es' ? 'Posteamos todos los días' : 'We post every day'}</span>
          </div>
          <div className="social-grid">
            {SOCIALS.map((s) => (
              <a key={s.key} className={'social-card ' + s.key} href={s.url} target="_blank" rel="noopener noreferrer">
                <span className="sc-icon">{s.icon}</span>
                <span className="sc-meta">
                  <span className="sc-name">{s.name}</span>
                  <span className="sc-handle">{s.handle}</span>
                </span>
                <span className="sc-foot"><b>{s.followers}</b>{lang === 'es' ? 'seguidores' : 'followers'}</span>
              </a>
            ))}
          </div>
          <a
            className="sf-wa"
            href={`https://wa.me/525512345678?text=${encodeURIComponent(lang === 'es' ? 'Hola, tengo una duda sobre Mucho Loco Gym' : 'Hi, I have a question about Mucho Loco Gym')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lang === 'es' ? '¿Dudas? Escríbenos al WhatsApp' : 'Questions? WhatsApp us'} <b>+52 55 1234 5678</b>
          </a>
        </div>
      </div>
    </section>
  );
}
