import type { RefObject } from 'react';
import Image from 'next/image';
import type { Translations } from '@mucho-loco/types';

interface HeroProps {
  t: Translations;
  fireRef: RefObject<HTMLCanvasElement | null>;
}

export function Hero({ t, fireRef }: HeroProps) {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <canvas ref={fireRef} className="hero-fire-canvas" />
      <div className="hero-content">
        <div className="hero-eyebrow"><span className="dot"></span>{t.hero.live}</div>
        <h1>
          {t.hero.titleA}<br />
          <span className="stroke">{t.hero.titleB}</span><br />
          <span className="red">{t.hero.titleC}</span>
        </h1>
        <p className="lead">{t.hero.lead}</p>
        <div className="hero-ctas">
          <a href="#memberships" className="btn-primary">{t.hero.ctaJoin}</a>
          <a href="#contact" className="btn-ghost">{t.hero.ctaTour}</a>
        </div>
      </div>
      <div className="hero-mascot">
        <div className="hero-mascot-glow"></div>
        <Image src="/assets/bull-head.png" alt="Mucho Loco mascot" width={320} height={360} priority />
      </div>
      <div className="hero-stats">
        {t.stats.map((s, i) => (
          <div className="hero-stat" key={i}>
            <div className="num">{s.n}</div>
            <div className="label">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
