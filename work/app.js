// ── LANG ─────────────────────────────────────────────────
let lang = 'fr';
function applyLang(l) {
  lang = l;
  document.querySelectorAll('[data-fr]').forEach(el => {
    const txt = el.getAttribute('data-' + l);
    if (txt) el.innerHTML = txt;
  });
  // Handle headline FR/EN spans
  const hlFr = document.querySelector('.hl-fr');
  const hlEn = document.querySelector('.hl-en');
  if (hlFr && hlEn) {
    hlFr.style.display = l === 'fr' ? '' : 'none';
    hlEn.style.display = l === 'en' ? '' : 'none';
  }
  document.getElementById('langBtn').textContent = l === 'fr' ? 'EN' : 'FR';
  document.getElementById('langBtn').setAttribute('aria-label', l === 'fr' ? 'Passer en anglais' : 'Switch to French');
  document.getElementById('navCta').setAttribute('aria-label', l === 'fr' ? 'Réserver un appel' : 'Book a call');
  document.getElementById('closeModal').setAttribute('aria-label', l === 'fr' ? 'Fermer' : 'Close');
  document.getElementById('backBtn').setAttribute('aria-label', l === 'fr' ? 'Retour' : 'Back');
  document.querySelector('html').lang = l;
  updateProgress(currentStep);
}
document.getElementById('langBtn').addEventListener('click', () => applyLang(lang === 'fr' ? 'en' : 'fr'));

// ── SCROLL REVEAL ─────────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach((e, i) => { if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 80); });
}, { threshold: .1 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ── FAQ ───────────────────────────────────────────────────
document.querySelectorAll('.faq-item').forEach((item, index) => {
  const btn = item.querySelector('.faq-q');
  const panel = item.querySelector('.faq-a');
  const btnId = 'faq-q-' + (index + 1);
  const panelId = 'faq-a-' + (index + 1);
  btn.id = btnId;
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', panelId);
  panel.id = panelId;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', btnId);
});
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement, wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── MODAL ─────────────────────────────────────────────────
const overlay      = document.getElementById('modalOverlay');
const modalSteps   = document.querySelectorAll('.modal-step');
const progressFill = document.getElementById('progressFill');
const progressStep = document.getElementById('progressStep');
const progressPct  = document.getElementById('progressPct');
const progressWrap = document.getElementById('progressWrap');
const backBtn      = document.getElementById('backBtn');
const textLoader   = document.getElementById('textLoader');
const loaderStatus = document.getElementById('loaderStatus');
const resultScreen = document.getElementById('resultScreen');
const modalBox     = document.getElementById('modalBox');
const TOTAL = modalSteps.length;
let lastFocusedEl = null;

let currentStep = 0;
let scores = new Array(TOTAL).fill(null);
let times  = new Array(TOTAL).fill(0);
let pendingTimers = [];
function clearPendingTimers() { pendingTimers.forEach(clearTimeout); pendingTimers = []; }

function totalScore() { return scores.reduce((a, v) => a + (v || 0), 0); }
function totalTime()  { return times.reduce((a, v) => a + (v || 0), 0); }

function updateProgress(step) {
  const pct = Math.round((step / TOTAL) * 100);
  progressFill.style.width = pct + '%';
  const n = String(step + 1).padStart(2, '0');
  progressStep.textContent = step < TOTAL ? n + ' / 0' + TOTAL : (lang === 'fr' ? 'TERMINÉ' : 'DONE');
  progressPct.textContent = pct + '%';
  backBtn.classList.toggle('visible', step > 0);
}

function showStep(i) {
  modalSteps.forEach(s => s.classList.remove('active'));
  if (i < TOTAL) { modalSteps[i].classList.add('active'); updateProgress(i); }
}

function getFocusableElements() {
  const selector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  return Array.from(modalBox.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
}

function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const focusables = getFocusableElements();
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleModalKeydown(event) {
  if (!overlay.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  trapFocus(event);
}

function openModal()  {
  lastFocusedEl = document.activeElement;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', handleModalKeydown);
  const focusables = getFocusableElements();
  if (focusables.length) focusables[0].focus();
}
function closeModal() {
  clearPendingTimers();
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleModalKeydown);
  if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
    lastFocusedEl.focus();
  }
}

function resetModal() {
  clearPendingTimers();
  currentStep = 0;
  scores = new Array(TOTAL).fill(null);
  times  = new Array(TOTAL).fill(0);
  resultScreen.classList.remove('active');
  textLoader.classList.remove('active');
  progressFill.classList.remove('complete');
  progressWrap.style.transition = '';
  progressWrap.style.opacity = '1';
  progressWrap.style.display = '';
  backBtn.classList.remove('visible');
  showStep(0);
}

['openQuiz','openQuiz2'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => { resetModal(); openModal(); });
});
document.getElementById('navCta').addEventListener('click', () => {
  const newWin = window.open('https://calendly.com/thibaudbn/30min', '_blank', 'noopener,noreferrer');
  if (newWin) newWin.opener = null;
});
document.getElementById('closeModal').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

document.querySelectorAll('a[target="_blank"]').forEach(a => {
  const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
  if (!rel.includes('noopener')) rel.push('noopener');
  if (!rel.includes('noreferrer')) rel.push('noreferrer');
  a.setAttribute('rel', rel.join(' '));
});

backBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    scores[currentStep] = null;
    times[currentStep]  = 0;
    currentStep--;
    showStep(currentStep);
  }
});

document.querySelectorAll('.opt').forEach(btn => {
  btn.addEventListener('click', () => {
    scores[currentStep] = parseInt(btn.dataset.score);
    times[currentStep]  = parseInt(btn.dataset.time) || 0;
    currentStep++;
    if (currentStep < TOTAL) {
      showStep(currentStep);
    } else {
      backBtn.classList.remove('visible');
      progressFill.style.width = '100%';
      progressStep.textContent = lang === 'fr' ? 'TERMINÉ' : 'DONE';
      progressPct.textContent = '100%';
      progressFill.classList.add('complete');
      modalSteps[currentStep - 1].classList.remove('active');
      pendingTimers.push(setTimeout(() => {
        progressWrap.style.transition = 'opacity .35s';
        progressWrap.style.opacity = '0';
        pendingTimers.push(setTimeout(() => { progressWrap.style.display = 'none'; runLoader(); }, 350));
      }, 600));
    }
  });
});

function runLoader() {
  textLoader.classList.add('active');
  const msgs = lang === 'fr'
    ? ['Analyse de votre profil...', 'Identification des frictions...', 'Calcul du temps récupérable...', 'Génération du résultat...']
    : ['Analysing your profile...', 'Identifying friction points...', 'Calculating recoverable time...', 'Generating your result...'];
  [0, 800, 1600, 2400].forEach((t, i) => pendingTimers.push(setTimeout(() => { loaderStatus.textContent = msgs[i]; }, t)));
  pendingTimers.push(setTimeout(() => { textLoader.classList.remove('active'); showResult(); }, 3200));
}

function showResult() {
  const s = totalScore();
  const t = totalTime();
  const h = Math.max(1, Math.round(t * 0.75));

  const title = document.getElementById('resultTitle');
  const timeEl = document.getElementById('resultTime');
  const desc  = document.getElementById('resultDesc');

  if (lang === 'fr') {
    timeEl.textContent = '~' + h + 'H / SEMAINE RÉCUPÉRABLES';
    if (s >= 10) {
      title.textContent = 'Vous perdez trop de temps. Changeons ça.';
      desc.textContent  = 'C\'est exactement le type de situation qu\'on peut améliorer rapidement. 30 minutes ensemble pour identifier ce qui doit être automatisé en priorité.';
    } else if (s >= 6) {
      title.textContent = 'Il y a clairement quelque chose à faire.';
      desc.textContent  = 'Votre friction est réelle. Un appel rapide permettra d\'identifier ce qui vaut la peine d\'être automatisé en priorité — sans engagement.';
    } else {
      title.textContent = 'Bonne curiosité.';
      desc.textContent  = 'Ce n\'est pas une priorité, mais anticiper maintenant peut faire une vraie différence dans 6 mois. Un appel stratégique n\'engage à rien.';
    }
  } else {
    timeEl.textContent = '~' + h + 'H / WEEK RECOVERABLE';
    if (s >= 10) {
      title.textContent = 'You\'re losing too much time. Let\'s change that.';
      desc.textContent  = 'This is exactly the type of situation we can improve quickly. 30 minutes together to identify what\'s worth automating first.';
    } else if (s >= 6) {
      title.textContent = 'There\'s clearly something to do.';
      desc.textContent  = 'Your friction is real. A quick call will identify what\'s worth automating first — no commitment.';
    } else {
      title.textContent = 'Good curiosity.';
      desc.textContent  = 'It\'s not a priority yet, but acting now can make a real difference in 6 months. A strategic call commits you to nothing.';
    }
  }
  resultScreen.classList.add('active');
}

document.getElementById('restartBtn').addEventListener('click', resetModal);

// SWIPE TO CLOSE
let ty = 0;
modalBox.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
modalBox.addEventListener('touchend',   e => { if (e.changedTouches[0].clientY - ty > 80) closeModal(); }, { passive: true });

applyLang(lang);
