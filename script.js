/* ==========================================================================
   NEXORA DIGITAL — script.js
   Vanilla ES6+. Optional libraries (loaded from CDN in index.html):
     - GSAP + ScrollTrigger  -> scroll reveals, masks, parallax, intro timeline
     - Three.js (r128)       -> hero 3D orb
   Every library is optional: if one fails to load, the site stays fully usable.

   Sections
     1. Helpers & feature flags
     2. Loader and intro
     3. Navigation, scroll progress, back-to-top
     4. Cursor glow, hero parallax, magnetic buttons, card tilt
     5. Hero 3D scene (Three.js) with CSS fallback
     6. GSAP scroll animations
     7. Counters
     8. Process tabs
     9. Testimonial carousel
    10. Dialog (project details, article previews, placeholder links)
    11. Contact form validation
    12. Footer year and init
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- 1. Helpers & feature flags ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const hasGSAP = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /** Split an element's text into word wrappers so each word can slide up from a mask. */
  function splitWords(el) {
    if (!el || el.dataset.split === 'done') return $$('.wi', el);
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'w';
      const inner = document.createElement('span');
      inner.className = 'wi';
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = 'done';
    return $$('.wi', el);
  }

  /* ---------- 2. Loader and intro ---------- */
  const loader = $('.loader');

  function removeLoader() {
    if (loader) loader.remove();
  }

  /** Counts the loader up, then resolves. Skipped entirely for reduced motion. */
  function runLoader() {
    return new Promise((resolve) => {
      if (!loader || prefersReduced) { removeLoader(); resolve(); return; }
      const countEl = $('#loader-count');
      const bar = $('#loader-bar');
      const duration = 1100;
      const start = performance.now();
      const tick = (now) => {
        const p = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        countEl.textContent = Math.round(eased * 100);
        bar.style.transform = `scaleX(${eased})`;
        if (p < 1) { requestAnimationFrame(tick); return; }
        // Slide the loader away
        if (hasGSAP()) {
          gsap.to(loader, { yPercent: -100, duration: 0.9, ease: 'power4.inOut', onComplete: () => { removeLoader(); resolve(); } });
        } else { removeLoader(); resolve(); }
        // Start the intro slightly before the loader finishes leaving
        setTimeout(resolve, 500);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Hero entrance: staggered headline, supporting text, CTAs, floating panels. */
  function prepareHeroIntro() {
    if (!hasGSAP() || prefersReduced) return null;
    const title = $('[data-hero-title]');
    const words = splitWords(title);
    gsap.set(words, { yPercent: 115 });
    gsap.set('[data-hero="status"], [data-hero="lead"], [data-hero="actions"] > *', { opacity: 0, y: 24 });
    gsap.set('[data-hero="panel"]', { opacity: 0, scale: 0.85, y: 30 });
    gsap.set('[data-hero="cue"]', { opacity: 0 });
    gsap.set('.nav', { yPercent: -100 });

    return () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.to('.nav', { yPercent: 0, duration: 0.9, clearProps: 'transform' }, 0)
        .to('[data-hero="status"]', { opacity: 1, y: 0, duration: 0.8 }, 0.1)
        .to(words, { yPercent: 0, duration: 1.1, stagger: 0.07 }, 0.2)
        .to('[data-hero="lead"]', { opacity: 1, y: 0, duration: 0.9 }, 0.7)
        // clearProps hands transforms back to CSS afterwards: buttons need them for the magnetic effect, panels for mouse parallax
        .to('[data-hero="actions"] > *', { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, clearProps: 'transform' }, 0.85)
        .to('[data-hero="panel"]', { opacity: 1, scale: 1, y: 0, duration: 1.1, stagger: 0.14, ease: 'back.out(1.4)', clearProps: 'transform' }, 0.9)
        .to('[data-hero="cue"]', { opacity: 1, duration: 0.8 }, 1.4);
    };
  }

  /* ---------- 3. Navigation, scroll progress, back-to-top ---------- */
  function initNav() {
    const nav = $('#nav');
    const toggle = $('#nav-toggle');
    const menu = $('#nav-menu');
    const links = $$('.nav__link');
    const progress = $('#progress-bar');
    const toTop = $('#to-top');
    let ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      toTop.classList.toggle('is-visible', y > 900);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    // Mobile menu
    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

    // Closed mobile menu must not be reachable by keyboard
    const syncMenuFocus = () => {
      const mobile = window.matchMedia('(max-width: 900px)').matches;
      const open = menu.classList.contains('is-open');
      if (mobile && !open) menu.setAttribute('inert', ''); else menu.removeAttribute('inert');
    };
    syncMenuFocus();
    new MutationObserver(syncMenuFocus).observe(menu, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', syncMenuFocus);

    // Highlight the link for the section in view
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = $$('main section[id]').filter((s) => map.has(s.id));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        map.get(entry.target.id).setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));

    // Back to top (floating button and footer link)
    $$('[data-to-top]').forEach((btn) => btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      $('#home').setAttribute('tabindex', '-1');
      $('#home').focus({ preventScroll: true });
    }));

    // Service cards preselect the contact form
    $$('[data-service]').forEach((a) => a.addEventListener('click', () => {
      const select = $('#f-service');
      if (select) select.value = a.dataset.service;
    }));
  }

  /* ---------- 4. Cursor glow, hero parallax, magnetic buttons, card tilt ---------- */
  function initPointerEffects() {
    if (isTouch) return;

    // Cursor glow (eased follow)
    const glow = $('#cursor-glow');
    if (glow && !prefersReduced) {
      let tx = window.innerWidth / 2, ty = window.innerHeight / 2, x = tx, y = ty, on = false;
      window.addEventListener('pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
        if (!on) { on = true; glow.classList.add('is-on'); }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { on = false; glow.classList.remove('is-on'); });
      const loop = () => {
        x = lerp(x, tx, 0.12); y = lerp(y, ty, 0.12);
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        requestAnimationFrame(loop);
      };
      loop();
    }

    // Magnetic buttons
    if (!prefersReduced) {
      $$('.magnetic').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--tx', `${(e.clientX - (r.left + r.width / 2)) * 0.22}px`);
          el.style.setProperty('--ty', `${(e.clientY - (r.top + r.height / 2)) * 0.32}px`);
        });
        el.addEventListener('pointerleave', () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
      });
    }

    // 3D tilt with cursor-following light (cards and project media)
    if (!prefersReduced) {
      $$('.tilt').forEach((el) => {
        const max = el.classList.contains('card') ? 6 : 4;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          el.style.setProperty('--ry', `${(px - 0.5) * 2 * max}deg`);
          el.style.setProperty('--rx', `${-(py - 0.5) * 2 * max}deg`);
          el.style.setProperty('--mx', `${px * 100}%`);
          el.style.setProperty('--my', `${py * 100}%`);
        });
        el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
      });
    } else {
      // Still give cards their light, but without tilt
      $$('.card').forEach((el) => el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      }));
    }
  }

  /** Shared pointer position for hero panels and the 3D scene (-1 to 1). */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  function initHeroParallax() {
    const hero = $('#home');
    if (isTouch || prefersReduced) return;
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    const panels = $$('.panel', hero);
    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(hero);
    const loop = () => {
      if (visible) {
        pointer.x = lerp(pointer.x, pointer.tx, 0.06);
        pointer.y = lerp(pointer.y, pointer.ty, 0.06);
        panels.forEach((p) => { p.style.setProperty('--mx', pointer.x.toFixed(3)); p.style.setProperty('--my', pointer.y.toFixed(3)); });
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- 5. Hero 3D scene (Three.js) with CSS fallback ---------- */
  function initHero3D() {
    const stage = $('#hero-visual');
    const canvas = $('#hero-canvas');
    const useFallback = () => { stage.classList.add('no-3d'); stage.classList.remove('is-3d'); };

    // Graceful degradation: no library, no WebGL, or a low-powered device
    const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
    if (!window.THREE || lowPower) return useFallback();
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return useFallback();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, alpha: true, powerPreference: 'high-performance' });
    } catch (err) { return useFallback(); }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); useFallback(); });

    const COBALT = 0x3657FF, LIME = 0xD7FF64, NAVY = 0x171C35;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 11);
    const rig = new THREE.Group();
    scene.add(rig);

    // Faceted, slowly morphing orb (flat shading gives the "sculpture" look)
    const orbGeo = new THREE.IcosahedronGeometry(1.55, isTouch ? 4 : 6);
    const base = orbGeo.attributes.position.array.slice();
    const orb = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial({
      color: 0x2740d6, metalness: 0.85, roughness: 0.25, flatShading: true, emissive: 0x0a1450, emissiveIntensity: 0.7
    }));
    rig.add(orb);

    // Lattice shell, orbit rings, floating shards
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.1, 2),
      new THREE.MeshBasicMaterial({ color: LIME, wireframe: true, transparent: true, opacity: 0.2 })
    );
    rig.add(shell);

    const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.012, 12, 180), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.75 }));
    ringA.rotation.x = 1.2;
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.01, 12, 180), new THREE.MeshBasicMaterial({ color: 0x93A4FF, transparent: true, opacity: 0.6 }));
    ringB.rotation.set(0.5, 0.9, 0);
    rig.add(ringA, ringB);

    const shards = [];
    const shardMat = [new THREE.MeshStandardMaterial({ color: LIME, metalness: 0.4, roughness: 0.35, flatShading: true }),
                      new THREE.MeshStandardMaterial({ color: COBALT, metalness: 0.6, roughness: 0.3, flatShading: true })];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.1 + Math.random() * 0.14), shardMat[i % 2]);
      const a = (i / 8) * Math.PI * 2, r = 3 + Math.random() * 1.1;
      m.userData = { a, r, y: (Math.random() - 0.5) * 3, s: 0.12 + Math.random() * 0.2, o: Math.random() * 6 };
      shards.push(m);
      rig.add(m);
    }

    // Particles for depth
    const count = isTouch ? 350 : 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.5 + Math.random() * 6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.8;
      pos[i * 3 + 2] = r * Math.cos(ph) - 2;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xF4F5F7, size: 0.035, transparent: true, opacity: 0.7, sizeAttenuation: true }));
    scene.add(particles);

    // Layered lighting
    scene.add(new THREE.AmbientLight(0x6070ff, 0.4));
    const keyLight = new THREE.PointLight(COBALT, 2.2, 0); keyLight.position.set(4, 3, 6);
    const rimLight = new THREE.PointLight(LIME, 1.5, 0); rimLight.position.set(-5, -2, 4);
    const topLight = new THREE.PointLight(0xffffff, 0.7, 0); topLight.position.set(0, 5, 5);
    scene.add(keyLight, rimLight, topLight);

    // Sizing: follow the stage element
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = camera.aspect < 0.9 ? 13 : 11;
      camera.updateProjectionMatrix();
      if (prefersReduced) renderOnce();
    };

    // Orb vertex displacement
    const deform = (t) => {
      const p = orbGeo.attributes.position, a = p.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2];
        const n = Math.sin(x * 1.7 + t * 0.9) * Math.sin(y * 1.5 + t * 0.7) * Math.sin(z * 1.6 + t * 0.8);
        const k = 1 + n * 0.17;
        a[i] = x * k; a[i + 1] = y * k; a[i + 2] = z * k;
      }
      p.needsUpdate = true;
      orbGeo.computeVertexNormals();
    };

    const clock = new THREE.Clock();
    let running = false, frame = 0;

    const draw = () => {
      const t = clock.getElapsedTime();
      deform(t);
      orb.rotation.y = t * 0.15;
      shell.rotation.y = -t * 0.08; shell.rotation.x = t * 0.05;
      ringA.rotation.z = t * 0.2; ringB.rotation.z = -t * 0.12;
      shards.forEach((m) => {
        const d = m.userData, ang = d.a + t * d.s;
        m.position.set(Math.cos(ang) * d.r, d.y + Math.sin(t + d.o) * 0.25, Math.sin(ang) * d.r * 0.6);
        m.rotation.x = t * 0.6 + d.o; m.rotation.y = t * 0.4;
      });
      particles.rotation.y = t * 0.012;
      // Mouse-responsive parallax (eased by the shared pointer values)
      rig.rotation.y = lerp(rig.rotation.y, pointer.x * 0.45, 0.06);
      rig.rotation.x = lerp(rig.rotation.x, pointer.y * 0.25, 0.06);
      particles.position.x = -pointer.x * 0.35; particles.position.y = pointer.y * 0.25;
      keyLight.position.x = 4 + pointer.x * 2; keyLight.position.y = 3 - pointer.y * 2;
      renderer.render(scene, camera);
    };
    const renderOnce = () => { deform(1.2); renderer.render(scene, camera); };
    const loop = () => { if (!running) return; draw(); frame = requestAnimationFrame(loop); };
    const start = () => { if (!running && !prefersReduced) { running = true; clock.start(); loop(); } };
    const stop = () => { running = false; cancelAnimationFrame(frame); };

    resize();
    stage.classList.add('is-3d');
    if (prefersReduced) renderOnce();

    new ResizeObserver(resize).observe(canvas);
    // Only render while the hero is on screen and the tab is visible
    let inView = true;
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; inView && !document.hidden ? start() : stop(); }).observe(stage);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : inView && start(); });
    start();
  }

  /* ---------- 6. GSAP scroll animations ---------- */
  function initScrollAnimations() {
    if (!hasGSAP() || prefersReduced) return;
    gsap.registerPlugin(ScrollTrigger);

    // Word-by-word heading reveals
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 115, duration: 1, ease: 'power4.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    // Simple fade-ups
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // Staggered groups (service cards, pillars, articles)
    $$('[data-stagger]').forEach((group) => {
      gsap.from(group.children, {
        y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        clearProps: 'all'   // hand transforms back to CSS so card tilt keeps working
      });
    });

    // Scroll-triggered image masks on project visuals.
    // Only clip-path is animated here: tweening transform/scale on .art would disable its CSS hover zoom.
    $$('.project__media').forEach((el) => {
      const radius = 28;
      gsap.fromTo(el,
        { clipPath: `inset(14% 12% 14% 12% round ${radius}px)` },
        { clipPath: `inset(0% 0% 0% 0% round ${radius}px)`, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 45%', scrub: true } });
    });

    // Parallax layers (desktop and tablet; the glow blobs and floating shapes)
    $$('[data-speed]').forEach((el) => {
      const speed = parseFloat(el.dataset.speed) || 0.2;
      gsap.to(el, { y: () => -speed * 160, ease: 'none',
        scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });

    // Hero visual drifts up slightly as you scroll away
    gsap.to('.hero__visual', { yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true } });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- 7. Counters ---------- */
  function initCounters() {
    const stats = $$('.stat');
    const run = (stat) => {
      const el = $('.count', stat);
      const target = parseInt(el.dataset.count, 10);
      const pad = parseInt(el.dataset.pad || '0', 10);
      const suffix = el.dataset.suffix || '';
      const format = (n) => String(n).padStart(pad, '0') + suffix;
      if (prefersReduced) { el.textContent = format(target); stat.classList.add('is-in'); return; }
      const dur = 1800, t0 = performance.now();
      stat.classList.add('is-in');
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = format(Math.round((1 - Math.pow(1 - p, 4)) * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    stats.forEach((s) => {
      const el = $('.count', s);
      if (!prefersReduced) el.textContent = String(0).padStart(parseInt(el.dataset.pad || '0', 10), '0') + (el.dataset.suffix || '');
      io.observe(s);
    });
  }

  /* ---------- 8. Process tabs ---------- */
  function initProcess() {
    const wrap = $('#steps');
    const tabs = $$('.step', wrap);
    const panels = $$('.step-panel');

    const select = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.classList.toggle('is-done', i < index);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
        panels[i].classList.toggle('is-active', active);
      });
      wrap.style.setProperty('--i', index);
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (e.key in keys) { e.preventDefault(); select((i + keys[e.key] + tabs.length) % tabs.length, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
    select(0);
  }

  /* ---------- 9. Testimonial carousel ---------- */
  function initCarousel() {
    const root = $('#carousel');
    const track = $('#carousel-track');
    const slides = $$('.slide', track);
    const dotsWrap = $('#carousel-dots');
    const status = $('#carousel-status');
    let index = 0;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'dot';
      b.setAttribute('aria-label', `Show testimonial ${i + 1}`);
      b.addEventListener('click', () => go(i));
      dotsWrap.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((s, n) => { n === index ? s.removeAttribute('inert') : s.setAttribute('inert', ''); });
      dots.forEach((d, n) => n === index ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current'));
      status.textContent = `Showing testimonial ${index + 1} of ${slides.length}`;
    }

    $('#carousel-prev').addEventListener('click', () => go(index - 1));
    $('#carousel-next').addEventListener('click', () => go(index + 1));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });

    // Swipe / drag (pointer events cover touch, pen and mouse)
    let startX = 0, startY = 0, dragging = false;
    const viewport = $('.carousel__viewport', root);
    viewport.addEventListener('pointerdown', (e) => { dragging = true; startX = e.clientX; startY = e.clientY; });
    window.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
    });
    window.addEventListener('pointercancel', () => { dragging = false; });

    go(0);
    status.textContent = '';
  }

  /* ---------- 10. Dialog ---------- */
  const PROJECTS = {
    aurora: {
      kicker: 'Premium E-commerce', title: 'AURORA',
      text: 'A fictional skincare brand used to show how we would approach a premium online store: editorial product pages, a calm visual system and a short, clear checkout.',
      list: ['Concept brand identity and visual direction', 'Product page and collection layouts', 'Custom WordPress theme approach', 'Search and ad landing page plan'],
      note: 'Fictional concept for demonstration. No real client, results or metrics are represented.'
    },
    velocity: {
      kicker: 'SaaS Marketing', title: 'VELOCITY',
      text: 'A fictional analytics platform used to demonstrate a conversion-focused marketing site, a trial funnel and the Google Ads structure behind it.',
      list: ['Positioning and messaging framework', 'Marketing site and pricing page layout', 'Google Ads campaign structure', 'Conversion tracking plan'],
      note: 'Fictional concept for demonstration. No real client, results or metrics are represented.'
    },
    monolith: {
      kicker: 'Creative Brand Identity', title: 'MONOLITH',
      text: 'A fictional architecture studio used to show a bold, minimal identity: a mark built from one strong shape, a restrained palette and print applications.',
      list: ['Logo and wordmark exploration', 'Typography and colour system', 'Stationery and signage concepts', 'Brand guidelines outline'],
      note: 'Fictional concept for demonstration. No real client, results or metrics are represented.'
    }
  };
  const ARTICLES = {
    trends: { kicker: 'Digital Marketing Trends', title: 'Where digital marketing is heading next: five shifts to plan for',
      text: 'This is a placeholder card. When you publish real articles, link each card to its own page and remove this preview.', list: [], note: 'Sample article. Reading time and date are placeholders.' },
    wordpress: { kicker: 'WordPress Performance', title: 'Why your WordPress site feels slow, and what to fix first',
      text: 'This is a placeholder card. When you publish real articles, link each card to its own page and remove this preview.', list: [], note: 'Sample article. Reading time and date are placeholders.' },
    seo: { kicker: 'SEO Strategy', title: 'SEO strategy for brands that are still growing',
      text: 'This is a placeholder card. When you publish real articles, link each card to its own page and remove this preview.', list: [], note: 'Sample article. Reading time and date are placeholders.' }
  };

  function initDialog() {
    const dialog = $('#dialog');
    const close = () => (dialog.close ? dialog.close() : dialog.removeAttribute('open'));

    const open = ({ kicker, title, text, list = [], note = '', cta = true }) => {
      $('#dialog-kicker').textContent = kicker;
      $('#dialog-title').textContent = title;
      $('#dialog-text').textContent = text;
      const ul = $('#dialog-list');
      ul.textContent = '';
      list.forEach((item) => { const li = document.createElement('li'); li.textContent = item; ul.appendChild(li); });
      const noteEl = $('#dialog-note');
      noteEl.textContent = note; noteEl.hidden = !note;
      $('#dialog-cta').hidden = !cta;
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    };

    $$('[data-open-project]').forEach((b) => b.addEventListener('click', () => open(PROJECTS[b.dataset.openProject])));
    $$('[data-open-article]').forEach((b) => b.addEventListener('click', () => open(ARTICLES[b.dataset.openArticle])));
    $$('[data-placeholder]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      open({ kicker: 'Social profile placeholder', title: a.dataset.placeholder,
        text: 'Replace this placeholder with the link to your real profile by editing the footer in index.html.', list: [], note: 'No profile is connected to this demo.', cta: false });
    }));

    $('#dialog-close').addEventListener('click', close);
    $('#dialog-cta').addEventListener('click', close);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });  // click on backdrop
  }

  /* ---------- 11. Contact form validation ----------
     This form is a front-end demo. It validates input but does NOT send anything.
     To receive real inquiries, replace the demo block marked below with a request
     to your form service or backend, for example:

       const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
         method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form)
       });
       if (!res.ok) { showStatus('We could not send your inquiry. Please try again.'); return; }

     Only show the success panel after the response is OK.
  ----------------------------------------------------------------- */
  function initForm() {
    const form = $('#inquiry-form');
    const status = $('#form-status');
    const success = $('#form-success');
    const fields = ['name', 'email', 'company', 'service', 'budget', 'details'];

    const rules = {
      name: (v) => v.trim().length >= 2 || 'Enter your name (at least 2 characters).',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid business email, like name@company.com.',
      company: (v) => v.trim().length >= 2 || 'Enter your company name.',
      service: (v) => !!v || 'Choose the service you are interested in.',
      budget: (v) => !!v || 'Choose a budget range. "Not sure yet" is fine.',
      details: (v) => v.trim().length >= 20 || 'Add a few more details: at least 20 characters.'
    };

    const check = (name) => {
      const input = form.elements[name];
      const err = $(`#f-${name}-error`);
      const result = rules[name](input.value);
      const ok = result === true;
      input.setAttribute('aria-invalid', String(!ok));
      err.hidden = ok;
      err.textContent = ok ? '' : result;
      return ok;
    };

    fields.forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') check(name); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(name); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = fields.filter((n) => !check(n));
      if (invalid.length) {
        status.textContent = `Please fix ${invalid.length} ${invalid.length === 1 ? 'field' : 'fields'} before submitting.`;
        status.classList.add('is-on');
        form.elements[invalid[0]].focus();
        return;
      }
      status.classList.remove('is-on');
      status.textContent = '';

      /* ===== DEMO ONLY: replace this block with a real submission (see comment above) ===== */
      form.hidden = true;
      success.hidden = false;
      success.focus();
      /* ===== END DEMO BLOCK ===== */
    });

    $('#form-edit').addEventListener('click', () => {
      success.hidden = true;
      form.hidden = false;
      form.elements.name.focus();
    });
  }

  /* ---------- 12. Footer year and init ---------- */
  function initYear() { const y = $('#year'); if (y) y.textContent = new Date().getFullYear(); }

  async function init() {
    initYear();
    initNav();
    initPointerEffects();
    initHeroParallax();
    initCounters();
    initProcess();
    initCarousel();
    initDialog();
    initForm();

    let playIntro = null;
    try { playIntro = prepareHeroIntro(); initScrollAnimations(); } catch (err) { console.warn('Animations disabled:', err); }
    try { initHero3D(); } catch (err) { console.warn('3D disabled:', err); $('#hero-visual').classList.add('no-3d'); }

    await runLoader();
    if (playIntro) { try { playIntro(); } catch (err) { console.warn(err); } }
    removeLoader();
  }

  // Scripts use "defer", so the DOM is ready; wait for load so CDN libraries exist.
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
