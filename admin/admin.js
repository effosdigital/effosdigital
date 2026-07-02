/* =========================================================
   Effos Digital — Lógica do painel admin
   ========================================================= */

/* ---------- Utilidades de imagem ---------- */
function effosResizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function effosToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(effosToast._t);
  effosToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ---------- Navegação entre telas ---------- */
const screens = ['screen-login', 'screen-forgot', 'screen-reset', 'screen-dashboard'];
function showScreen(id) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id) ? 'flex' : 'none';
  });
}

function showAlert(elId, type, msg) {
  const el = document.getElementById(elId);
  el.className = 'alert show alert-' + type;
  el.textContent = msg;
}
function hideAlert(elId) {
  const el = document.getElementById(elId);
  el.className = 'alert';
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await effosGetAuthConfig(); // garante config padrão criada

  if (effosHasValidSession()) {
    await openDashboard();
  } else {
    showScreen('screen-login');
  }

  /* ----- LOGIN ----- */
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert('login-alert');
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    const ok = await effosLogin(pass);
    btn.disabled = false;
    if (ok) {
      document.getElementById('login-password').value = '';
      await openDashboard();
    } else {
      showAlert('login-alert', 'error', 'Senha incorreta. Tente novamente ou recupere sua senha.');
    }
  });

  document.getElementById('go-forgot').addEventListener('click', async () => {
    const cfg = await effosGetAuthConfig();
    document.getElementById('forgot-email-display').textContent = cfg.recoveryEmail;
    hideAlert('forgot-alert');
    showScreen('screen-forgot');
  });
  document.getElementById('back-to-login-1').addEventListener('click', () => showScreen('screen-login'));
  document.getElementById('back-to-login-2').addEventListener('click', () => showScreen('screen-login'));

  /* ----- ESQUECI A SENHA ----- */
  document.getElementById('forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert('forgot-alert');
    const btn = document.getElementById('forgot-btn');
    btn.disabled = true;
    const result = await effosRequestPasswordReset();
    btn.disabled = false;
    if (result.sent) {
      showAlert('forgot-alert', 'success', 'Código enviado! Verifique sua caixa de entrada (e o spam).');
    } else if (result.error) {
      showAlert('forgot-alert', 'error', result.error + ' Código de teste (modo local): ' + result.testCode);
    } else {
      showAlert('forgot-alert', 'info',
        'Envio de e-mail ainda não configurado. Modo de teste — use este código para continuar: ' + result.testCode +
        '. Configure o EmailJS em "Configurações de recuperação" no painel para enviar e-mails de verdade.');
    }
    setTimeout(() => showScreen('screen-reset'), result.sent ? 800 : 0);
  });

  /* ----- REDEFINIR SENHA ----- */
  document.getElementById('reset-form').addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert('reset-alert');
    const code = document.getElementById('reset-code').value.trim();
    const newPass = document.getElementById('reset-new-password').value;
    const newPass2 = document.getElementById('reset-new-password-2').value;
    if (newPass.length < 6) {
      showAlert('reset-alert', 'error', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPass !== newPass2) {
      showAlert('reset-alert', 'error', 'As senhas não coincidem.');
      return;
    }
    if (!effosVerifyResetCode(code)) {
      showAlert('reset-alert', 'error', 'Código inválido ou expirado. Solicite um novo.');
      return;
    }
    await effosCompletePasswordReset(newPass);
    showAlert('reset-alert', 'success', 'Senha redefinida! Faça login novamente.');
    document.getElementById('reset-form').reset();
    setTimeout(() => showScreen('screen-login'), 1400);
  });

  /* ----- LOGOUT ----- */
  document.getElementById('logout-btn').addEventListener('click', () => {
    effosEndSession();
    showScreen('screen-login');
  });

  /* ----- SALVAR CONTEÚDO ----- */
  document.getElementById('save-btn').addEventListener('click', saveAllContent);

  /* ----- RESTAURAR PADRÕES ----- */
  document.getElementById('reset-defaults-btn').addEventListener('click', () => {
    if (confirm('Isso vai apagar todas as edições de conteúdo e ícones enviados, voltando ao padrão original do site. Deseja continuar?')) {
      effosResetData();
      effosToast('Conteúdo restaurado ao padrão.');
      loadContentIntoForm();
    }
  });

  /* ----- SALVAR CONFIG DE E-MAIL / SENHA ----- */
  document.getElementById('account-form').addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert('account-alert');
    const cfg = await effosGetAuthConfig();
    cfg.recoveryEmail = document.getElementById('acc-recovery-email').value.trim() || cfg.recoveryEmail;
    cfg.emailjs = {
      serviceId: document.getElementById('acc-emailjs-service').value.trim(),
      templateId: document.getElementById('acc-emailjs-template').value.trim(),
      publicKey: document.getElementById('acc-emailjs-key').value.trim()
    };
    const newPass = document.getElementById('acc-new-password').value;
    if (newPass) {
      if (newPass.length < 6) {
        showAlert('account-alert', 'error', 'A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      cfg.passwordHash = await effosHash(newPass);
    }
    effosSaveAuthConfig(cfg);
    document.getElementById('acc-new-password').value = '';
    showAlert('account-alert', 'success', 'Configurações da conta salvas.');
  });
});

/* ---------- Exportar data.js atualizado (publicação definitiva) ---------- */
function effosBuildDataJsFile(d) {
  const json = JSON.stringify(d, null, 2);
  return `/* =========================================================
   Effos Digital — Dados do site (fonte única de verdade)
   Usado pela landing (index.html) e pelo painel admin.
   Persistência: localStorage (mesma origem/domínio).
   Gerado pelo painel admin em ${new Date().toLocaleString('pt-BR')}.
   ========================================================= */

const EFFOS_STORAGE_KEY = 'effos_site_data_v1';
const EFFOS_AUTH_KEY = 'effos_admin_auth_v1';

/* Ícone padrão = emoji (fallback). Quando o admin envia uma logo,
   o valor vira uma dataURL (base64) e passa a ser usado no lugar do emoji. */
const EFFOS_DEFAULT_DATA = ${json};

/* Merge raso + profundo o suficiente para nossos objetos (2 níveis) */
function effosDeepMerge(base, override) {
  if (!override) return JSON.parse(JSON.stringify(base));
  const out = Array.isArray(base) ? [] : {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(override || {})]);
  keys.forEach(k => {
    const b = base ? base[k] : undefined;
    const o = override ? override[k] : undefined;
    if (o === undefined) { out[k] = b; return; }
    if (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o)) {
      out[k] = effosDeepMerge(b, o);
    } else {
      out[k] = o;
    }
  });
  return out;
}

function effosLoadData() {
  try {
    const raw = localStorage.getItem(EFFOS_STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(EFFOS_DEFAULT_DATA));
    const parsed = JSON.parse(raw);
    // stats é array — se existir no override, usa o override completo (evita merge estranho de índices)
    const merged = effosDeepMerge(EFFOS_DEFAULT_DATA, parsed);
    if (Array.isArray(parsed.stats) && parsed.stats.length) merged.stats = parsed.stats;
    return merged;
  } catch (e) {
    console.error('Effos: erro ao ler dados salvos, usando padrão.', e);
    return JSON.parse(JSON.stringify(EFFOS_DEFAULT_DATA));
  }
}

function effosSaveData(data) {
  localStorage.setItem(EFFOS_STORAGE_KEY, JSON.stringify(data));
}

function effosResetData() {
  localStorage.removeItem(EFFOS_STORAGE_KEY);
}
`;
}

function effosDownloadDataJs(d) {
  const content = effosBuildDataJsFile(d);
  const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      saveAllContent(); // garante que o formulário atual está salvo antes de exportar
      effosDownloadDataJs(currentData);
      effosToast('Arquivo data.js baixado! Suba-o no GitHub em assets/js/data.js.');
    });
  }
});

/* ---------- Dashboard ---------- */
async function openDashboard() {
  showScreen('screen-dashboard');
  loadContentIntoForm();
  const cfg = await effosGetAuthConfig();
  document.getElementById('acc-recovery-email').value = cfg.recoveryEmail || '';
  document.getElementById('acc-emailjs-service').value = (cfg.emailjs && cfg.emailjs.serviceId) || '';
  document.getElementById('acc-emailjs-template').value = (cfg.emailjs && cfg.emailjs.templateId) || '';
  document.getElementById('acc-emailjs-key').value = (cfg.emailjs && cfg.emailjs.publicKey) || '';
}

let currentData = null;

function loadContentIntoForm() {
  currentData = effosLoadData();
  const d = currentData;

  document.getElementById('f-brand-name').value = d.brand.name;
  setIconPreview('logo', d.brand.logo, 'Logo atual');

  document.getElementById('f-hero-badge').value = d.hero.badge;
  document.getElementById('f-hero-title1').value = d.hero.titleLine1;
  document.getElementById('f-hero-accent').value = d.hero.titleAccent;
  document.getElementById('f-hero-title2').value = d.hero.titleLine2;
  document.getElementById('f-hero-sub').value = d.hero.subtitle;

  d.stats.forEach((s, i) => {
    document.getElementById('f-stat-value-' + i).value = s.value;
    document.getElementById('f-stat-prefix-' + i).value = s.prefix || '';
    document.getElementById('f-stat-suffix-' + i).value = s.suffix || '';
    document.getElementById('f-stat-text-' + i).value = s.text;
  });

  document.getElementById('f-lt-bio1').value = d.linktree.bioLine1;
  document.getElementById('f-lt-bio2').value = d.linktree.bioLine2;
  document.getElementById('f-lt-location').value = d.linktree.location;

  document.getElementById('f-wpp-number').value = d.linktree.whatsapp.number;
  document.getElementById('f-wpp-label').value = d.linktree.whatsapp.label;
  setIconPreview('wpp', d.linktree.whatsapp.icon, 'WhatsApp');

  document.getElementById('f-ig-handle').value = d.linktree.instagram.handle;
  document.getElementById('f-ig-label').value = d.linktree.instagram.label;
  setIconPreview('ig', d.linktree.instagram.icon, 'Instagram');

  document.getElementById('f-email-address').value = d.linktree.email.address;
  setIconPreview('email', d.linktree.email.icon, 'E-mail');

  document.getElementById('f-footer').value = d.footer;

  document.getElementById('f-videos-title').value = (d.videosSection && d.videosSection.title) || '';
  document.getElementById('f-videos-subtitle').value = (d.videosSection && d.videosSection.subtitle) || '';
  renderVideosEditor((d.videosSection && d.videosSection.items) || []);
}

/* ---------- Vídeos (carrossel) ---------- */
function effosYoutubeIdPreview(url) {
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
  } catch (e) { /* inválida */ }
  return null;
}

function renderVideosEditor(items) {
  const list = document.getElementById('videos-list');
  if (!list) return;
  list.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'panel-desc';
    empty.style.marginBottom = '14px';
    empty.textContent = 'Nenhum vídeo cadastrado ainda. Clique em "Adicionar vídeo" abaixo.';
    list.appendChild(empty);
    return;
  }

  items.forEach((video, i) => {
    const row = document.createElement('div');
    row.className = 'stat-editor video-editor';
    row.dataset.index = i;

    const titleBar = document.createElement('div');
    titleBar.className = 'stat-editor-title';
    titleBar.style.display = 'flex';
    titleBar.style.justifyContent = 'space-between';
    titleBar.style.alignItems = 'center';
    titleBar.innerHTML = '<span>Vídeo ' + (i + 1) + '</span>';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = 'Remover';
    removeBtn.addEventListener('click', () => {
      currentData.videosSection.items.splice(i, 1);
      renderVideosEditor(currentData.videosSection.items);
    });
    titleBar.appendChild(removeBtn);
    row.appendChild(titleBar);

    const grid = document.createElement('div');
    grid.className = 'grid-2';

    const titleField = document.createElement('div');
    titleField.className = 'field';
    titleField.innerHTML = '<label>Título (opcional)</label>';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'v-title';
    titleInput.placeholder = 'Ex: Como funciona o CRM';
    titleInput.value = video.title || '';
    titleField.appendChild(titleInput);

    const urlField = document.createElement('div');
    urlField.className = 'field';
    urlField.innerHTML = '<label>Link do YouTube (aceita vídeos não listados)</label>';
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 'v-url';
    urlInput.placeholder = 'https://www.youtube.com/watch?v=...';
    urlInput.value = video.url || '';
    urlField.appendChild(urlInput);

    const hint = document.createElement('div');
    hint.className = 'field-hint';
    hint.style.gridColumn = '1 / -1';
    urlInput.addEventListener('input', () => {
      const id = effosYoutubeIdPreview(urlInput.value);
      hint.textContent = urlInput.value.trim()
        ? (id ? '✔ Link válido reconhecido.' : '⚠ Não foi possível reconhecer esse link do YouTube. Confira se está completo.')
        : '';
      hint.style.color = id ? '#86EFAC' : '#FCA5A5';
    });
    const initialId = effosYoutubeIdPreview(urlInput.value);
    hint.textContent = urlInput.value.trim() ? (initialId ? '✔ Link válido reconhecido.' : '⚠ Não foi possível reconhecer esse link do YouTube. Confira se está completo.') : '';
    hint.style.color = initialId ? '#86EFAC' : '#FCA5A5';

    grid.appendChild(titleField);
    grid.appendChild(urlField);
    row.appendChild(grid);
    row.appendChild(hint);

    list.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-video-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!currentData) currentData = effosLoadData();
      if (!currentData.videosSection) currentData.videosSection = { title: 'Vídeos', subtitle: '', items: [] };
      currentData.videosSection.items.push({ title: '', url: '' });
      renderVideosEditor(currentData.videosSection.items);
    });
  }
});

function setIconPreview(key, value, label) {
  const preview = document.getElementById('preview-' + key);
  if (!preview) return;
  preview.innerHTML = '';
  if (value && value.startsWith && value.startsWith('data:image')) {
    const img = document.createElement('img');
    img.src = value; img.alt = label;
    preview.appendChild(img);
  } else {
    preview.textContent = value || '?';
  }
}

/* Uploads de ícones/logo */
function wireIconUpload(inputId, key, maxSize) {
  document.getElementById(inputId).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await effosResizeImage(file, maxSize);
      pendingIcons[key] = dataUrl;
      setIconPreview(key, dataUrl, key);
      effosToast('Imagem carregada — clique em "Salvar alterações" para aplicar.');
    } catch (err) {
      alert('Não foi possível processar essa imagem: ' + err.message);
    }
  });
}

const pendingIcons = {};

document.addEventListener('DOMContentLoaded', () => {
  wireIconUpload('upload-logo', 'logo', 400);
  wireIconUpload('upload-wpp', 'wpp', 128);
  wireIconUpload('upload-ig', 'ig', 128);
  wireIconUpload('upload-email', 'email', 128);

  ['logo', 'wpp', 'ig', 'email'].forEach(key => {
    const btn = document.getElementById('remove-' + key);
    if (btn) btn.addEventListener('click', () => {
      pendingIcons[key] = '__REMOVE__';
      const fallback = key === 'logo' ? 'assets/images/logo.png' : (key === 'wpp' ? '💬' : key === 'ig' ? '📸' : '📧');
      setIconPreview(key, key === 'logo' ? fallback : fallback, key);
      effosToast('Removido — clique em "Salvar alterações" para aplicar.');
    });
  });
});

function saveAllContent() {
  const d = currentData || effosLoadData();

  d.brand.name = document.getElementById('f-brand-name').value.trim() || d.brand.name;
  if (pendingIcons.logo === '__REMOVE__') d.brand.logo = 'assets/images/logo.png';
  else if (pendingIcons.logo) d.brand.logo = pendingIcons.logo;

  d.hero.badge = document.getElementById('f-hero-badge').value;
  d.hero.titleLine1 = document.getElementById('f-hero-title1').value;
  d.hero.titleAccent = document.getElementById('f-hero-accent').value;
  d.hero.titleLine2 = document.getElementById('f-hero-title2').value;
  d.hero.subtitle = document.getElementById('f-hero-sub').value;

  d.stats = d.stats.map((s, i) => ({
    value: parseInt(document.getElementById('f-stat-value-' + i).value, 10) || 0,
    prefix: document.getElementById('f-stat-prefix-' + i).value,
    suffix: document.getElementById('f-stat-suffix-' + i).value,
    text: document.getElementById('f-stat-text-' + i).value
  }));

  d.linktree.bioLine1 = document.getElementById('f-lt-bio1').value;
  d.linktree.bioLine2 = document.getElementById('f-lt-bio2').value;
  d.linktree.location = document.getElementById('f-lt-location').value;

  d.linktree.whatsapp.number = document.getElementById('f-wpp-number').value.replace(/\D/g, '');
  d.linktree.whatsapp.label = document.getElementById('f-wpp-label').value;
  if (pendingIcons.wpp === '__REMOVE__') d.linktree.whatsapp.icon = '💬';
  else if (pendingIcons.wpp) d.linktree.whatsapp.icon = pendingIcons.wpp;

  d.linktree.instagram.handle = document.getElementById('f-ig-handle').value.replace('@', '');
  d.linktree.instagram.label = document.getElementById('f-ig-label').value;
  if (pendingIcons.ig === '__REMOVE__') d.linktree.instagram.icon = '📸';
  else if (pendingIcons.ig) d.linktree.instagram.icon = pendingIcons.ig;

  d.linktree.email.address = document.getElementById('f-email-address').value.trim();
  d.linktree.email.label = d.linktree.email.address;
  if (pendingIcons.email === '__REMOVE__') d.linktree.email.icon = '📧';
  else if (pendingIcons.email) d.linktree.email.icon = pendingIcons.email;

  d.footer = document.getElementById('f-footer').value;

  if (!d.videosSection) d.videosSection = { title: 'Vídeos', subtitle: '', items: [] };
  d.videosSection.title = document.getElementById('f-videos-title').value.trim() || 'Vídeos';
  d.videosSection.subtitle = document.getElementById('f-videos-subtitle').value.trim();
  d.videosSection.items = Array.from(document.querySelectorAll('#videos-list .video-editor')).map(row => ({
    title: row.querySelector('.v-title').value.trim(),
    url: row.querySelector('.v-url').value.trim()
  })).filter(v => v.url); // descarta linhas sem link

  effosSaveData(d);
  currentData = d;
  Object.keys(pendingIcons).forEach(k => delete pendingIcons[k]);
  effosToast('Alterações salvas! Elas já estão valendo na página principal.');
}
