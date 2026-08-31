interface FireOpts {
  count?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function startFireCanvas(canvas: HTMLCanvasElement, opts: FireOpts = {}): () => void {
  const maybeCtx = canvas.getContext('2d');
  // getContext can genuinely return null (privacy-hardened browsers, low
  // memory, canvas already bound to a different context type). The fire
  // effect is decorative — degrade silently instead of crashing the page.
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;
  const dpr = window.devicePixelRatio || 1;
  const N = opts.count || 90;
  let w = 0, h = 0;
  const particles: Particle[] = [];

  function resize() {
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cssW;
    h = cssH;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function spawn(): Particle {
    return {
      x: Math.random() * w,
      y: h + Math.random() * 30,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.6 + Math.random() * 1.8),
      r: 1 + Math.random() * 2.5,
      life: 0,
      maxLife: 120 + Math.random() * 220,
      hue: 8 + Math.random() * 32,
    };
  }

  for (let i = 0; i < N; i++) {
    const p = spawn();
    p.life = Math.random() * p.maxLife;
    p.y = Math.random() * h;
    particles.push(p);
  }

  let running = true;
  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx += (Math.random() - 0.5) * 0.05;
      p.vy -= 0.004;
      p.life++;
      const t = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - t);
      const radius = p.r * (1 - t * 0.4);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 5);
      grad.addColorStop(0, `hsla(${p.hue + 10}, 100%, 70%, ${alpha})`);
      grad.addColorStop(0.35, `hsla(${p.hue}, 100%, 50%, ${alpha * 0.55})`);
      grad.addColorStop(1, `hsla(${p.hue}, 100%, 30%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 5, 0, Math.PI * 2);
      ctx.fill();
      if (p.life > p.maxLife || p.y < -20) Object.assign(p, spawn());
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(tick);
  }
  tick();
  return () => { running = false; ro.disconnect(); };
}
