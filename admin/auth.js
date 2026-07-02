/* =========================================================
   Effos Digital — Autenticação do painel admin
   - Login com senha (hash SHA-256, nunca texto puro)
   - Recuperação de senha por e-mail via EmailJS
     (serviço gratuito de envio de e-mail direto do navegador,
     necessário porque este site é 100% estático, sem servidor).
   ========================================================= */

const EFFOS_SESSION_KEY = 'effos_admin_session_v1';
const EFFOS_RECOVERY_KEY = 'effos_admin_recovery_v1';
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas

/* ---------- Hash simples (SHA-256) ---------- */
async function effosHash(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Config de autenticação (senha + e-mail + EmailJS) ---------- */
const EFFOS_DEFAULT_PASSWORD = 'effos2026';

async function effosGetAuthConfig() {
  let raw = localStorage.getItem(EFFOS_AUTH_KEY);
  if (!raw) {
    const defaultHash = await effosHash(EFFOS_DEFAULT_PASSWORD);
    const cfg = {
      passwordHash: defaultHash,
      recoveryEmail: 'effosdigital@gmail.com',
      emailjs: { serviceId: '', templateId: '', publicKey: '' }
    };
    localStorage.setItem(EFFOS_AUTH_KEY, JSON.stringify(cfg));
    return cfg;
  }
  return JSON.parse(raw);
}

function effosSaveAuthConfig(cfg) {
  localStorage.setItem(EFFOS_AUTH_KEY, JSON.stringify(cfg));
}

/* ---------- Sessão ---------- */
function effosStartSession() {
  sessionStorage.setItem(EFFOS_SESSION_KEY, String(Date.now() + SESSION_DURATION_MS));
}
function effosHasValidSession() {
  const exp = sessionStorage.getItem(EFFOS_SESSION_KEY);
  return exp && Date.now() < parseInt(exp, 10);
}
function effosEndSession() {
  sessionStorage.removeItem(EFFOS_SESSION_KEY);
}

/* ---------- Login ---------- */
async function effosLogin(password) {
  const cfg = await effosGetAuthConfig();
  const hash = await effosHash(password);
  if (hash === cfg.passwordHash) {
    effosStartSession();
    return true;
  }
  return false;
}

/* ---------- Recuperação de senha ---------- */
function effosGenCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* Envia o código por e-mail via EmailJS, se configurado.
   Retorna { sent: bool, testCode: string|null, error?: string } */
async function effosRequestPasswordReset() {
  const cfg = await effosGetAuthConfig();
  const code = effosGenCode();
  const record = { code, email: cfg.recoveryEmail, expires: Date.now() + 10 * 60 * 1000 };
  localStorage.setItem(EFFOS_RECOVERY_KEY, JSON.stringify(record));

  const { serviceId, templateId, publicKey } = cfg.emailjs || {};
  if (serviceId && templateId && publicKey && window.emailjs) {
    try {
      await window.emailjs.send(serviceId, templateId, {
        to_email: cfg.recoveryEmail,
        code: code
      }, publicKey);
      return { sent: true, testCode: null };
    } catch (err) {
      console.error('EmailJS error', err);
      return { sent: false, testCode: code, error: 'Falha ao enviar e-mail. Verifique a configuração do EmailJS.' };
    }
  }
  // EmailJS não configurado: modo de teste, mostra o código na tela
  return { sent: false, testCode: code, error: null };
}

function effosVerifyResetCode(code) {
  const raw = localStorage.getItem(EFFOS_RECOVERY_KEY);
  if (!raw) return false;
  const record = JSON.parse(raw);
  if (Date.now() > record.expires) return false;
  return record.code === code;
}

async function effosCompletePasswordReset(newPassword) {
  const cfg = await effosGetAuthConfig();
  cfg.passwordHash = await effosHash(newPassword);
  effosSaveAuthConfig(cfg);
  localStorage.removeItem(EFFOS_RECOVERY_KEY);
}
