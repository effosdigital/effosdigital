/* =========================================================
   Effos Digital — Script da landing page
   Lê os dados (padrão + eventuais edições feitas no /admin)
   e aplica em toda a página.
   ========================================================= */

(function () {
  const data = effosLoadData();

  /* ---------- Helpers ---------- */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.textContent = value;
  }

  function setIcon(el, iconValue, fallbackEmoji) {
    if (!el) return;
    const val = iconValue || fallbackEmoji;
    if (val && val.startsWith('data:image')) {
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = val;
      img.alt = '';
      el.appendChild(img);
    } else {
      el.textContent = val;
    }
  }

  function setLogo(imgEl, src) {
    if (imgEl && src) imgEl.src = src;
  }

  /* ---------- Marca / navbar ---------- */
  setLogo(document.getElementById('nav-logo-img'), data.brand.logo);
  setLogo(document.getElementById('lt-logo-img'), data.brand.logo);
  setText('nav-brand-name', data.brand.name);
  setText('lt-name', data.brand.name);

  /* ---------- Hero ---------- */
  setText('hero-badge-text', data.hero.badge);
  setText('hero-title-line1', data.hero.titleLine1);
  setText('hero-title-accent', data.hero.titleAccent);
  setText('hero-title-line2', data.hero.titleLine2);
  setText('hero-sub', data.hero.subtitle);

  /* ---------- Linktree ---------- */
  setText('lt-bio-line1', data.linktree.bioLine1);
  setText('lt-bio-line2', data.linktree.bioLine2);
  setText('lt-bio-location', data.linktree.location);

  const wpp = data.linktree.whatsapp;
  const wppUrl = 'https://wa.me/' + (wpp.number || '').replace(/\D/g, '');
  ['lt-wpp-link', 'soc-wpp-link'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = wppUrl;
  });
  setText('lt-wpp-label', wpp.label);
  setIcon(document.getElementById('lt-wpp-icon'), wpp.icon, '💬');
  setIcon(document.getElementById('soc-wpp-icon'), wpp.icon, '💬');

  const ig = data.linktree.instagram;
  const igUrl = 'https://instagram.com/' + (ig.handle || '').replace('@', '');
  ['lt-ig-link', 'soc-ig-link'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = igUrl;
  });
  setText('lt-ig-label', ig.label);
  setIcon(document.getElementById('lt-ig-icon'), ig.icon, '📸');
  setIcon(document.getElementById('soc-ig-icon'), ig.icon, '📸');

  const email = data.linktree.email;
  const mailUrl = 'mailto:' + (email.address || '');
  ['lt-email-link', 'soc-email-link'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = mailUrl;
  });
  setText('lt-email-label', email.address);
  setIcon(document.getElementById('lt-email-icon'), email.icon, '📧');
  setIcon(document.getElementById('soc-email-icon'), email.icon, '📧');

  /* ---------- Footer ---------- */
  const footerEl = document.getElementById('footer-copy');
  if (footerEl && data.footer) {
    footerEl.innerHTML = data.footer.replace('♥', '<span>♥</span>');
  }

  /* ---------- Estatísticas: contador + digitação lateral ---------- */
  const statsContainer = document.getElementById('stats-rows-container');
  if (statsContainer) {
    statsContainer.innerHTML = '';
    data.stats.forEach((stat, i) => {
      const row = document.createElement('div');
      row.className = 'stat-row reveal' + (i ? ' reveal-d' + Math.min(i, 6) : '');
      row.innerHTML =
        '<div class="stat-number">' +
          (stat.prefix ? '<span class="stat-prefix">' + stat.prefix + '</span>' : '') +
          '<span class="num" data-target="' + stat.value + '">0</span>' +
          (stat.suffix ? '<span class="stat-suffix">' + stat.suffix + '</span>' : '') +
        '</div>' +
        '<div class="stat-divider"></div>' +
        '<div class="stat-typewriter"><span class="tw-text"></span><span class="tw-cursor">|</span></div>';
      row.dataset.text = stat.text;
      statsContainer.appendChild(row);
    });
  }

  function animCounter(el, target, duration) {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('pt-BR');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function typeWriter(el, text, duration) {
    let i = 0;
    const totalChars = text.length;
    const intervalMs = Math.max(duration / Math.max(totalChars, 1), 12);
    const tick = () => {
      i++;
      el.textContent = text.slice(0, i);
      if (i < totalChars) setTimeout(tick, intervalMs);
    };
    tick();
  }

  function runStatRow(row) {
    const numEl = row.querySelector('.num');
    const twEl = row.querySelector('.tw-text');
    const duration = 1800;
    if (numEl) animCounter(numEl, parseInt(numEl.dataset.target, 10) || 0, duration);
    if (twEl) typeWriter(twEl, row.dataset.text || '', duration);
  }

  const statRowObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        runStatRow(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-row').forEach(row => statRowObs.observe(row));

  /* ---------- Vídeos (carrossel) ---------- */
  function effosYoutubeId(url) {
    if (!url) return null;
    try {
      const clean = url.trim();
      const u = new URL(clean.match(/^https?:\/\//) ? clean : 'https://' + clean);
      const host = u.hostname.replace('www.', '');
      if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
      if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
        if (m) return m[2];
      }
    } catch (e) { /* URL inválida */ }
    return null;
  }

  const videosSectionEl = document.getElementById('videos');
  const videoCarousel = document.getElementById('video-carousel');
  const videosData = (data.videosSection && data.videosSection.items) || [];

  if (videosSectionEl && videoCarousel && videosData.length) {
    setText('videos-title', data.videosSection.title);
    setText('videos-subtitle', data.videosSection.subtitle);
    setText('videos-divider-label', data.videosSection.title);
    videoCarousel.innerHTML = '';

    videosData.forEach(v => {
      const vid = effosYoutubeId(v && v.url);
      if (!vid) return; // ignora links inválidos silenciosamente

      const card = document.createElement('div');
      card.className = 'video-card';

      const frameWrap = document.createElement('div');
      frameWrap.className = 'video-frame-wrap';
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid);
      iframe.title = (v.title && v.title.trim()) || 'Vídeo Effos Digital';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      frameWrap.appendChild(iframe);
      card.appendChild(frameWrap);

      if (v.title && v.title.trim()) {
        const titleEl = document.createElement('div');
        titleEl.className = 'video-card-title';
        titleEl.textContent = v.title.trim();
        card.appendChild(titleEl);
      }

      videoCarousel.appendChild(card);
    });

    if (videoCarousel.children.length) {
      videosSectionEl.style.display = '';
      const prevBtn = document.getElementById('video-nav-prev');
      const nextBtn = document.getElementById('video-nav-next');
      const scrollAmount = () => (videoCarousel.querySelector('.video-card') || {}).offsetWidth + 18 || 320;
      if (prevBtn) prevBtn.addEventListener('click', () => videoCarousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
      if (nextBtn) nextBtn.addEventListener('click', () => videoCarousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
    }
  }

  /* ---------- Navbar scroll ---------- */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  /* ---------- Cursor glow ---------- */
  const glow = document.getElementById('cursor-glow');
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });

  /* ---------- Reveal on scroll (elementos estáticos) ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
})();
