/**
 * MoneyMap — Supabase Auth & Profile Sync
 */

const SUPABASE_URL  = 'https://oogvxhzzdoqucxalohzw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZ3Z4aHp6ZG9xdWN4YWxvaHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYxMzQsImV4cCI6MjA5MDQ5MjEzNH0._MWkMhK87_BBD8RBSemRKkEaJ20OVC75U4GCDh1pJUw';

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _supabase;
}

// ── Auth state ─────────────────────────────────────────────
let currentUser = null;

async function initAuth() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  updateAuthUI();

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser) loadProfile();
  });

  if (currentUser) await loadProfile();
}

function updateAuthUI() {
  const signinBtn  = document.getElementById('auth-signin-btn');
  const signoutBtn = document.getElementById('auth-signout-btn');
  const userLabel  = document.getElementById('auth-user-label');

  if (currentUser) {
    signinBtn?.style && (signinBtn.style.display = 'none');
    if (signoutBtn) signoutBtn.style.display = 'inline-flex';
    if (userLabel)  userLabel.textContent = currentUser.email;
  } else {
    if (signinBtn)  signinBtn.style.display = 'inline-flex';
    signoutBtn?.style && (signoutBtn.style.display = 'none');
    if (userLabel)  userLabel.textContent = '';
  }
}

// ── Sign in modal ──────────────────────────────────────────
function showAuthModal(mode = 'signin') {
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const toggle = document.getElementById('auth-modal-toggle');
  modal.dataset.mode = mode;
  title.textContent = mode === 'signin' ? 'Sign in to MoneyMap' : 'Create your account';
  toggle.textContent = mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in';
  document.getElementById('auth-error').textContent = '';
  modal.style.display = 'flex';
}

function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function toggleAuthMode() {
  const modal = document.getElementById('auth-modal');
  const currentMode = modal.dataset.mode || 'signin';
  showAuthModal(currentMode === 'signin' ? 'signup' : 'signin');
}

async function submitAuth() {
  const modal   = document.getElementById('auth-modal');
  const mode    = modal.dataset.mode || 'signin';
  const email   = document.getElementById('auth-email').value.trim();
  const pass    = document.getElementById('auth-password').value;
  const errEl   = document.getElementById('auth-error');
  const btn     = document.getElementById('auth-submit-btn');

  if (!email || !pass) { errEl.textContent = 'Email and password required.'; return; }
  btn.textContent = 'Please wait…'; btn.disabled = true;

  const sb = getSupabase();
  let error;
  if (mode === 'signup') {
    ({ error } = await sb.auth.signUp({ email, password: pass }));
  } else {
    ({ error } = await sb.auth.signInWithPassword({ email, password: pass }));
  }

  btn.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
  btn.disabled = false;

  if (error) { errEl.textContent = error.message; return; }
  hideAuthModal();
}

async function signOut() {
  await getSupabase().auth.signOut();
}

// ── Profile sync ───────────────────────────────────────────
async function loadProfile() {
  if (!currentUser) return;
  const sb = getSupabase();
  const { data, error } = await sb.from('clearflow_profiles').select('*').eq('id', currentUser.id).single();
  if (error || !data) return;

  // Populate profile state in app.js
  if (data.incomes?.length)     profile.incomes     = data.incomes;
  if (data.categories?.length)  profile.categories  = data.categories;
  if (data.custom_cats?.length) profile.customCats  = data.custom_cats;

  // Re-render profile form
  rebuildProfileForm();
  showSyncStatus('Profile loaded ✓');
}

async function saveProfile() {
  if (!currentUser) { showAuthModal('signin'); return; }
  const sb = getSupabase();
  const { error } = await sb.from('clearflow_profiles').upsert({
    id: currentUser.id,
    email: currentUser.email,
    incomes: profile.incomes,
    categories: profile.categories,
    custom_cats: profile.customCats,
    updated_at: new Date().toISOString(),
  });
  if (error) { console.error('Save error:', error); return; }
  showSyncStatus('Saved ✓');
}

function showSyncStatus(msg) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

function rebuildProfileForm() {
  // Clear and rebuild income entries from loaded profile
  document.getElementById('income-entries').innerHTML = '';
  if (profile.incomes.length) {
    profile.incomes.forEach(inc => addIncomeEntry(inc));
  } else {
    addIncomeEntry();
  }
  // Re-select category pills
  document.querySelectorAll('.cat-pill').forEach(pill => {
    const key = pill.dataset.key;
    if (profile.categories.length === 0 || profile.categories.includes(key)) {
      pill.classList.add('selected');
    } else {
      pill.classList.remove('selected');
    }
  });
}

// ── Auto-save on profile change ────────────────────────────
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (currentUser) saveProfile(); }, 1500);
}

// Export
window.MoneyMapAuth = {
  initAuth, showAuthModal, hideAuthModal, toggleAuthMode,
  submitAuth, signOut, saveProfile, scheduleSave
};
