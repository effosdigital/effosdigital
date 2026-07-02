/* =========================================================
   Effos Digital — Dados do site (fonte única de verdade)
   Usado pela landing (index.html) e pelo painel admin.
   Persistência: localStorage (mesma origem/domínio).
   ========================================================= */

const EFFOS_STORAGE_KEY = 'effos_site_data_v1';
const EFFOS_AUTH_KEY = 'effos_admin_auth_v1';

/* Ícone padrão = emoji (fallback). Quando o admin envia uma logo,
   o valor vira uma dataURL (base64) e passa a ser usado no lugar do emoji. */
const EFFOS_DEFAULT_DATA = {
  brand: {
    name: 'Effos Digital',
    logo: 'assets/images/logo.png'
  },
  hero: {
    badge: 'Plataforma #1 em Automação IA no Brasil',
    titleLine1: 'Seu negócio no',
    titleAccent: 'piloto automático',
    titleLine2: 'com IA real.',
    subtitle: 'CRM inteligente, ChatBots para WhatsApp e Agentes de IA que atendem, qualificam e fecham vendas enquanto você dorme.'
  },
  stats: [
    {
      value: 95,
      prefix: '',
      suffix: '%',
      text: 'das empresas relatam aumento de receita com IA'
    },
    {
      value: 93475,
      prefix: '',
      suffix: '',
      text: 'empresas utilizam algum tipo de IA desde 2025'
    },
    {
      value: 20,
      prefix: '',
      suffix: '%',
      text: 'de aumento de receita ao adotar CRM aliado a I.A.'
    }
  ],
  linktree: {
    bioLine1: '🚀 SaaS de CRM, ChatBots e Agentes de IA',
    bioLine2: 'para negócios que querem crescer de verdade.',
    location: 'Belém, PA — Brasil 🇧🇷',
    whatsapp: { number: '5591988226592', label: 'Falar no WhatsApp', icon: '💬' },
    instagram: { handle: 'effosdigital', label: 'Seguir no Instagram', icon: '📸' },
    email: { address: 'effosdigital@gmail.com', label: 'effosdigital@gmail.com', icon: '📧' }
  },
  videosSection: {
    title: 'Vídeos',
    subtitle: 'Confira nossos conteúdos em destaque',
    items: []
  },
  footer: '© 2025 Effos Digital · Feito com ♥ e muita IA no Brasil 🇧🇷'
};

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
