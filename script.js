// Track navigation state
const pageOrder = ['index', 'page2', 'page3', 'page4', 'page5', 'page5-friends'];
let currentPage = 'index';

// Global navigation (SPA-style)
function navigate(page) {
  if (!page) return;
  const name = page.replace(/\.html$/, '');

  // Determine direction based on page order
  const currentIndex = pageOrder.indexOf(currentPage);
  const nextIndex = pageOrder.indexOf(name);
  const direction = nextIndex > currentIndex ? 'forward' : 'back';

  // If returning to the start, stop any sad track and reset audio to default
  try {
    const a = audio();
    if (a && name === 'index') {
      const src = (a.getAttribute && a.getAttribute('src')) || a.src || '';
      if (src && src.toLowerCase().includes('sad.mp3')) {
        // stop sad track
        a.pause();
        // restore main music source and loop behavior
        a.src = 'music.mp3';
        a.loop = true;
        a.currentTime = 0;
        // update toggle label to show it's not playing by default
        const mt = musicToggle();
        if (mt) mt.textContent = 'Play music ❤️';
      }
    }
  } catch (e) {
    console.warn('Error resetting audio on navigate:', e);
  }

  showSection(name, direction);
  currentPage = name;
}

function showSection(name, direction) {
  const pages = document.querySelectorAll('.page');

  // Only redirect on direct yes/no button clicks, not popup continue
  if (name === 'page5' && direction === 'forward' && !window._isPopupContinue) {
    // Yes choice - redirect to answer-reveal.html
    window.location.href = 'answer-reveal.html';
    return;
  } else if (name === 'page5-friends' && direction === 'forward' && !window._isPopupContinue) {
    // No choice - redirect to answer-reveal-alt.html
    window.location.href = 'answer-reveal-alt.html';
    return;
  }

  pages.forEach(p => {
    const key = p.getAttribute('data-page') || '';
    p.setAttribute('data-direction', direction);

    if (key === name) {
      requestAnimationFrame(() => {
        p.setAttribute('data-visible', 'true');
      });
    } else if (p.getAttribute('data-visible') === 'true') {
      p.setAttribute('data-visible', 'false');
    }
  });

  // confetti canvas only needed on page4
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    if (name === 'page4') {
      canvas.classList.add('active');
    } else {
      canvas.classList.remove('active');
    }
  }

  // ensure page-specific bindings are attached when showing
  // clear reveal timer if leaving page3
  if (name !== 'page3') clearRevealTimer();
  attachPageBindings(name);

  // schedule card emoji reveal near end of transition for the shown page
  scheduleEmojiReveal(name);
}

let _emojiTimer = null;
function scheduleEmojiReveal(pageName) {
  // clear any pending reveals
  if (_emojiTimer) { clearTimeout(_emojiTimer); _emojiTimer = null; }
  // hide any visible emojis first
  document.querySelectorAll('.card-emoji.emoji-visible').forEach(el => el.classList.remove('emoji-visible'));
  // schedule reveal ~700ms after showSection so it aligns with slide animation
  _emojiTimer = setTimeout(() => {
    const page = document.querySelector(`.page[data-page="${pageName}"]`);
    if (!page) return;
    const emoji = page.querySelector('.card-emoji');
    if (emoji) emoji.classList.add('emoji-visible');
    // reveal extras too
    revealCardExtras(pageName);
    _emojiTimer = null;
  }, 700);
}

// Extra decorative random emojis per card
const EMOJI_POOL = ['🌸', '🌼', '💖', '🌈', '☁️', '🌙', '✨', '💫', '🌺', '🥰', '💐', '🌻'];
const FRIENDS_POOL = ['💔', '😢', '😞', '💧', '😿', '🖤', '💔', '😥', '☔', '💔'];
function randomEmojiForCard(card) {
  // if this is the friends page card, use sad pool
  const page = card && card.closest && card.closest('.page') ? card.closest('.page').getAttribute('data-page') : '';
  if (page === 'page5-friends') return FRIENDS_POOL[Math.floor(Math.random() * FRIENDS_POOL.length)];
  return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
}

function populateCardEmojis() {
  document.querySelectorAll('.card').forEach(card => {
    // create a wrapper for extras
    let wrapper = card.querySelector('.card-emojis');
    if (wrapper) return; // already populated
    wrapper = document.createElement('div');
    wrapper.className = 'card-emojis';
    wrapper.setAttribute('aria-hidden', 'true');
    // content rects to avoid (elements inside the card)
    const contentEls = Array.from(card.children).filter(c => !c.classList || !c.classList.contains('card-emojis'));
    const contentRects = contentEls.map(el => el.getBoundingClientRect());
    // add random count 10..12 emojis (reduces load)
    const count = 10 + Math.floor(Math.random() * 3);
    const placed = [];
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let placedOk = false;
      let e;
      while (attempts < 80 && !placedOk) {
        attempts++;
        e = document.createElement('div');
        e.className = 'card-emoji-extra';
        const inner = document.createElement('span');
        inner.className = 'card-emoji-inner';
        inner.textContent = randomEmojiForCard(card);
        e.appendChild(inner);

        // random scale and rotation
        const scale = (0.6 + Math.random() * 1.2).toFixed(2); // 0.6 - 1.8
        const rot = Math.floor(-35 + Math.random() * 70); // -35..35deg
        e.style.transform = `translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`;

        // random position as percent within card bounds (keeps layout responsive)
        const leftPct = 6 + Math.random() * 88; // percent
        const topPct = 6 + Math.random() * 80;
        e.style.left = `${leftPct}%`;
        e.style.top = `${topPct}%`;

        // random animation timing as inline CSS variables
        const dur = (3 + Math.random() * 4).toFixed(2); // 3-7s
        const delay = (Math.random() * 3).toFixed(2);
        inner.style.animationDuration = dur + 's';
        inner.style.animationDelay = delay + 's';

        // add glow element behind emoji
        const glow = document.createElement('span');
        glow.className = 'emoji-glow';
        e.insertBefore(glow, inner);

        // set per-card glow color variable (friends page => red/sad, others neon)
        const page = card.closest && card.closest('.page') ? card.closest('.page').getAttribute('data-page') : '';
        if (page === 'page5-friends') {
          card.style.setProperty('--emoji-glow-color', '255,100,110'); // soft red
        } else {
          card.style.setProperty('--emoji-glow-color', '255,64,192'); // neon pink default
        }

        // append temporarily to measure
        wrapper.appendChild(e);
        card.appendChild(wrapper);

        const b = e.getBoundingClientRect();
        // check against content rects and placed emojis
        let collide = false;
        for (const cr of contentRects) {
          // small padding to avoid touching text
          const pad = 6;
          if (!(b.right < cr.left + pad || b.left > cr.right - pad || b.bottom < cr.top + pad || b.top > cr.bottom - pad)) {
            collide = true; break;
          }
        }
        if (!collide) {
          for (const p of placed) {
            if (!(b.right < p.left || b.left > p.right || b.bottom < p.top || b.top > p.bottom)) {
              collide = true; break;
            }
          }
        }

        if (!collide) {
          placed.push(b);
          placedOk = true;
          // give initial state hidden; will be revealed later
        } else {
          // remove and try again
          e.remove();
        }
      }
      // if failed to place after many attempts, skip
    }
    card.appendChild(wrapper);
  });
}

function revealCardExtras(pageName) {
  const page = document.querySelector(`.page[data-page="${pageName}"]`);
  if (!page) return;
  page.querySelectorAll('.card-emojis .card-emoji-extra').forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('emoji-visible');
      const inner = el.querySelector('.card-emoji-inner');
      if (inner) inner.style.opacity = '1';
    }, 60 * i);
  });
}

// --- Background Music ---
const audio = () => document.getElementById('bg-music');
const musicToggle = () => document.getElementById('music-toggle');
const openBtn = () => document.getElementById('open-btn');

function enableOpenBtn() {
  const btn = openBtn();
  if (!btn) return;
  btn.disabled = false;
  btn.classList.remove('disabled-lowglow');
}
function disableOpenBtn() {
  const btn = openBtn();
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add('disabled-lowglow');
}

// music toggle binding (global)
function initMusicToggle() {
  const mt = musicToggle();
  if (!mt) return;
  // bind only once
  if (!mt._bound) {
    mt.addEventListener('click', () => {
      const a = audio();
      if (!a) return alert("Drop your music.mp3 file in the folder first!");
      if (a.paused) {
        a.play().catch(() => { });
        mt.textContent = 'Pause music 🤍';
        // if main music started, enable Open button
        try {
          const src = (a.getAttribute && a.getAttribute('src')) || a.src || '';
          if (src && src.toLowerCase().includes('music.mp3')) enableOpenBtn();
        } catch (e) { }
      } else {
        a.pause();
        mt.textContent = 'Play music ❤️';
        // pause disables progression
        disableOpenBtn();
      }
    });
    mt._bound = true;
  }
  // sync label with current audio state if audio element exists
  const a = audio();
  if (a) mt.textContent = a.paused ? 'Play music ❤️' : 'Pause music 🤍';
}

// Attach listeners to audio to enable/disable the open button when music plays/pauses
function attachOpenBtnAudioHooks() {
  const a = audio();
  if (!a) return;
  if (a._openHooks) return;
  a.addEventListener('play', () => {
    try {
      const src = (a.getAttribute && a.getAttribute('src')) || a.src || '';
      if (src && src.toLowerCase().includes('music.mp3')) enableOpenBtn();
      else disableOpenBtn();
    } catch (e) { disableOpenBtn(); }
  });
  a.addEventListener('pause', () => disableOpenBtn());
  a.addEventListener('ended', () => disableOpenBtn());
  a._openHooks = true;
}

// --- Page 2: Popup ---
function maybePopup() {
  const p = document.getElementById('popup');
  if (!p) return alert("Just say yes already 😜");
  p.classList.remove('hidden');
}
function closePopup() {
  const p = document.getElementById('popup');
  p.classList.add('hidden');
}

// --- Page 3: Reveal steps ---
let stageIndex = 0;
function revealNext() {
  stageIndex++;
  const s = document.getElementById('stage' + stageIndex);
  const backBtn = document.getElementById('page3-back');
  // reveal the stage if present
  if (s) {
    // show container and intro when revealing first paragraph
    if (stageIndex === 1) {
      const stagesContainer = document.querySelector('.stages');
      if (stagesContainer) stagesContainer.classList.remove('hidden');
      const intro = document.getElementById('page3-intro');
      if (intro) intro.classList.remove('hidden');
    }
    s.classList.remove('hidden');
    // show back button after first reveal
    if (backBtn && stageIndex >= 1) backBtn.classList.remove('hidden');
  } else {
    navigate('page4');
  }
}

// Reveal countdown state
let revealTimer = null;
let revealCountdown = 0;

function clearRevealTimer() {
  if (revealTimer) {
    clearInterval(revealTimer);
    revealTimer = null;
  }
  const btn = document.getElementById('reveal-btn');
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('disabled-lowglow');
    btn.textContent = 'Reveal';
  }
}

function startRevealCountdown() {
  const btn = document.getElementById('reveal-btn');
  if (!btn) return;
  // don't start another timer if one is active
  if (revealTimer) return;
  revealCountdown = 10;
  btn.disabled = true;
  btn.classList.add('disabled-lowglow');
  btn.textContent = `Reveal (${revealCountdown})`;
  revealTimer = setInterval(() => {
    revealCountdown--;
    if (revealCountdown > 0) {
      btn.textContent = `Reveal (${revealCountdown})`;
    } else {
      clearRevealTimer();
      // show next stage automatically when countdown completes
      revealNext();
    }
  }, 1000);
}

// --- Page 4: Proposal actions ---
// We'll attach these when the page is shown (or on load)
function attachPageBindings(name) {
  // ensure music toggle exists
  initMusicToggle();

  // Page3 reveal reset when entering page3
  if (name === 'page3') {
    stageIndex = 0;
    // reset stage visibility
    ['stage1', 'stage2', 'stage3'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      // hide all stages initially (reveal button shows them in order)
      el.classList.add('hidden');
    });
    // attach reveal button handler
    const revealBtn = document.getElementById('reveal-btn');
    if (revealBtn && !revealBtn._bound) {
      revealBtn.addEventListener('click', startRevealCountdown);
      revealBtn._bound = true;
    }
    // ensure any previous timers are cleared when entering page3
    clearRevealTimer();
    // make sure open button is disabled until music starts
    disableOpenBtn();
  }

  // Page4 yes/no buttons
  if (name === 'page4') {
    const yes = document.getElementById('yes-btn');
    const no = document.getElementById('no-btn');
    if (yes && !yes._bound) {
      yes.addEventListener('click', () => {
        startConfetti();
        doHearts(15);
        showResult("Yesss!! 💖", "You just made my whole life, I'm exited to talk to you.😭❤️");
        try { audio().play().catch(() => { }); } catch (e) { }
      });
      yes._bound = true;
    }
    if (no && !no._bound) {
      no.addEventListener('click', () => {
        // If the main music is playing, swap it to a sad track that does not loop
        try {
          const a = audio();
          if (a && !a.paused) {
            const src = (a.getAttribute && a.getAttribute('src')) || a.src || '';
            if (src && src.toLowerCase().includes('music.mp3')) {
              // stop current track
              a.pause();
              // switch to sad track (play once)
              a.src = 'sad.mp3';
              a.loop = false;
              a.currentTime = 0;
              a.play().catch(() => { });
              // update UI label
              const mt = musicToggle();
              if (mt) mt.textContent = 'Pause music 🤍';
            }
          }
        } catch (e) {
          console.warn('Could not swap tracks', e);
        }

        // route the 'no' flow to the friends-specific finale
        showResult("No worries ✨", "Thanks for being honest you're still amazing. Take care!", 'page5-friends');
      });
      no._bound = true;
    }
  }

  // Page4 confetti canvas init when entering page4
  if (name === 'page4') {
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      // ensure canvas is sized when needed
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener('resize', resize);
    }
  }
}

function showResult(title, body, targetPage = 'page5') {
  const popup = document.getElementById('result');
  if (!popup) return;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-body').textContent = body;
  // store the navigation target on the popup for the Continue button
  popup.dataset.target = targetPage || 'page5';
  popup.classList.remove('hidden');
}

// Hide result popup and navigate to the configured target (default page5)
function hideResultAndContinue() {
  const popup = document.getElementById('result');
  const target = popup && popup.dataset && popup.dataset.target ? popup.dataset.target : 'page5';
  if (popup) popup.classList.add('hidden');
  window._isPopupContinue = true;
  navigate(target);
  window._isPopupContinue = false; // reset after navigation
}

// --- Floating Hearts ---
function doHearts(count = 10) {
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.style.left = (20 + Math.random() * 60) + '%';
    heart.style.top = (60 + Math.random() * 30) + '%';
    heart.textContent = ['💖', '💕', '❤️', '💘'][Math.floor(Math.random() * 4)];
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 3500);
  }
}

// --- Confetti ---
let confettiAnimation, confettiInterval;
function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  const confetti = [];
  const colors = ['#FF7A9A', '#FFD56B', '#8BE5D4', '#B6A0FF', '#FFB3D6'];
  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      vx: -1 + Math.random() * 2,
      vy: 2 + Math.random() * 6,
      r: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  let ticks = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confetti.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.r += 4;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });
    ticks++;
    if (ticks > 300) {
      stopConfetti();
      return;
    }
    confettiAnimation = requestAnimationFrame(draw);
  }
  confettiAnimation = requestAnimationFrame(draw);
  clearTimeout(confettiInterval);
  confettiInterval = setTimeout(() => stopConfetti(), 7000);
}
function stopConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  cancelAnimationFrame(confettiAnimation);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  clearTimeout(confettiInterval);
}

// --- Page 5: Share answer ---
async function shareCopy() {
  // Get base URL without hash/params and remove any existing html filename
  const baseUrl = window.location.href.split('#')[0].split('?')[0].replace(/\/[^\/]*$/, '/');

  // Determine which result page to link to based on current page
  const currentPage = document.querySelector('.page[data-visible="true"]');
  const pageName = currentPage ? currentPage.getAttribute('data-page') : '';

  // Generate the appropriate result URL with mysterious names
  const resultUrl = baseUrl + (pageName === 'page5-friends' ? 'answer-reveal-alt.html' : 'answer-reveal.html');

  // Create share text with emoji and suspense
  const shareText = "You got your proposal answer! Click here to know 👇🏻";

  // Prepare share data
  const shareData = {
    title: "My Answer to Your Proposal 💌",
    text: shareText,
    url: resultUrl
  };

  try {
    // Check if Web Share API is available
    if (navigator.share) {
      await navigator.share(shareData);
      showResult("Thanks for sharing! 💝", "They'll be excited to see your answer!", null);
    } else {
      // Fallback to clipboard if share API is not available
      await navigator.clipboard.writeText(shareText + "\n" + resultUrl);
      showResult("Link copied! 📋", "Now you can paste and send your answer! They'll be curious to see it! 😉", null);
    }
  } catch (err) {
    if (err.name !== 'AbortError') { // Don't show error if user just cancelled sharing
      showResult("Oops!", "Try copying this link instead:", null);
      prompt("Copy this link to share your answer:", resultUrl);
    }
  }
}

// --- Floating Sparkles (for all pages) ---
function createSparkles() {
  const sparkleContainer = document.createElement('div');
  sparkleContainer.style.position = 'fixed';
  sparkleContainer.style.inset = '0';
  sparkleContainer.style.pointerEvents = 'none';
  sparkleContainer.style.zIndex = '5';
  document.body.appendChild(sparkleContainer);

  function spawnSparkle() {
    const s = document.createElement('div');
    s.style.position = 'absolute';
    s.style.width = s.style.height = (2 + Math.random() * 3) + 'px';
    s.style.background = ['#ff4081', '#40c9ff', '#ffffff'][Math.floor(Math.random() * 3)];
    s.style.borderRadius = '50%';
    s.style.boxShadow = `0 0 8px ${s.style.background}`;
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.opacity = '0.8';
    sparkleContainer.appendChild(s);
    s.animate([
      { transform: 'scale(1)', opacity: 0.8 },
      { transform: 'scale(1.4)', opacity: 0.4 },
      { transform: 'scale(0.6)', opacity: 0 }
    ], {
      duration: 4000 + Math.random() * 2000,
      easing: 'ease-out'
    });
    setTimeout(() => s.remove(), 5500);
  }
  setInterval(spawnSparkle, 250);
}
createSparkles();

// --- Page 4: Glowing proposal text animation ---
window.addEventListener('load', () => {
  const proposal = document.querySelector('.proposal-text');
  if (proposal) {
    proposal.style.textShadow = '0 0 10px #ff4081, 0 0 20px #40c9ff';
    proposal.animate([
      { textShadow: '0 0 10px #ff4081, 0 0 20px #40c9ff' },
      { textShadow: '0 0 20px #40c9ff, 0 0 30px #ff4081' },
      { textShadow: '0 0 10px #ff4081, 0 0 20px #40c9ff' }
    ], {
      duration: 2500,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  }
});

// Initialize SPA and global bindings early so Play Music works immediately
document.addEventListener('DOMContentLoaded', () => {
  // show initial page (index)
  showSection('index');
  // init music toggle label and binding
  initMusicToggle();
  // attach bindings for proposal page if present
  attachPageBindings('page4');
  // attach open button audio hooks so the Open button enables when main music plays
  attachOpenBtnAudioHooks();
  // populate random emojis inside cards
  populateCardEmojis();
});

// --- Audio reactive visualizer & beat detector ---
let audioCtx, analyser, dataArray, rafId, audioSource;
let audioReactiveInited = false;
let lastBeatTime = 0;
let _lastBassAvg = 0;

// Neon particle system
let neonCanvas, neonCtx, neonParticles = [], neonRaf, neonRunning = false;


function ensureAudioReactive() {
  if (audioReactiveInited) return;
  const a = audio();
  if (!a) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // create source from the media element
    audioSource = audioCtx.createMediaElementSource(a);
    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    // visualizer removed; particle and beat systems remain
    audioReactiveInited = true;
  } catch (e) {
    // older browsers or blocked audio context
    console.warn('Audio reactive not available', e);
  }
}

function startAudioReactive() {
  ensureAudioReactive();
  if (!analyser) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
  loopAudioReactive();
}

function stopAudioReactive() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  document.body.classList.remove('music-beat');
}

function loopAudioReactive() {
  rafId = requestAnimationFrame(loopAudioReactive);
  analyser.getByteFrequencyData(dataArray);

  // compute low-frequency energy (bass)
  const bassCount = Math.max(3, Math.floor(dataArray.length * 0.03));
  let bassSum = 0;
  for (let i = 0; i < bassCount; i++) bassSum += dataArray[i];
  const bassAvg = bassSum / (bassCount * 255);
  _lastBassAvg = bassAvg;

  // dynamic thresholding + cooldown to detect beats (less sensitive)
  const now = performance.now();
  const threshold = 0.18; // increased to reduce sensitivity
  if (bassAvg > threshold && (now - lastBeatTime) > 260) {
    lastBeatTime = now;
    // trigger beat effect
    document.body.classList.add('music-beat');
    setTimeout(() => document.body.classList.remove('music-beat'), 220);
  }

  // map bassAvg to a gentle glow intensity for emoji glows (0..1.2)
  const glowIntensity = Math.min(1.2, Math.max(0, (bassAvg - 0.02) / 0.45));
  try { document.documentElement.style.setProperty('--emoji-glow-intensity', glowIntensity.toFixed(3)); } catch (e) { }

  // visualizer removed; neon particles react via _lastBassAvg
}

// --- Neon particles reacting to bass ---
function createNeonCanvas() {
  if (neonCanvas) return;
  neonCanvas = document.createElement('canvas');
  neonCanvas.id = 'neon-canvas';
  neonCanvas.style.position = 'fixed';
  neonCanvas.style.left = '0';
  neonCanvas.style.top = '0';
  neonCanvas.style.width = '100%';
  neonCanvas.style.height = '100%';
  neonCanvas.style.pointerEvents = 'none';
  neonCanvas.style.zIndex = '1'; // behind cards (cards have z-index ~10)
  document.body.appendChild(neonCanvas);
  neonCtx = neonCanvas.getContext('2d');
  resizeNeon();
  window.addEventListener('resize', resizeNeon);
  // populate particles
  for (let i = 0; i < 80; i++) neonParticles.push(randomParticle());
}

function resizeNeon() {
  if (!neonCanvas) return;
  neonCanvas.width = window.innerWidth * devicePixelRatio;
  neonCanvas.height = window.innerHeight * devicePixelRatio;
  neonCtx.scale(devicePixelRatio, devicePixelRatio);
}

function randomParticle() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    size: 1 + Math.random() * 3,
    hue: 300 + Math.random() * 80,
    alpha: 0.06 + Math.random() * 0.18
  };
}

function startNeon() {
  createNeonCanvas();
  neonRunning = true;
  neonLoop();
}

function stopNeon() {
  neonRunning = false;
  if (neonRaf) cancelAnimationFrame(neonRaf);
}

function neonLoop() {
  neonRaf = requestAnimationFrame(neonLoop);
  if (!neonCtx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  neonCtx.clearRect(0, 0, w, h);

  // speed factor based on bass (less aggressive mapping)
  // map bassAvg 0..0.6 => 0.6..1.8 (subtle reaction)
  const speedFactor = 0.6 + Math.min(1, _lastBassAvg / 0.35) * 1.2;

  neonCtx.globalCompositeOperation = 'lighter';
  neonParticles.forEach(p => {
    // move with base speed scaled by speedFactor
    p.x += p.vx * speedFactor * 6;
    p.y += p.vy * speedFactor * 6;

    // wrap
    if (p.x < -40) p.x = w + 40;
    if (p.x > w + 40) p.x = -40;
    if (p.y < -40) p.y = h + 40;
    if (p.y > h + 40) p.y = -40;

    // draw intensified glow: larger radial gradient and brighter core
    const radius = p.size * 10 * (1 + speedFactor * 0.35);
    const grd = neonCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    const coreAlpha = Math.min(1, p.alpha * (0.9 + speedFactor * 0.6));
    grd.addColorStop(0, `hsla(${p.hue},98%,70%,${coreAlpha})`);
    grd.addColorStop(0.12, `hsla(${p.hue},98%,60%,${Math.min(0.5, coreAlpha * 0.6)})`);
    grd.addColorStop(0.4, `hsla(${p.hue},92%,50%,${Math.min(0.26, coreAlpha * 0.28)})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    neonCtx.fillStyle = grd;
    neonCtx.beginPath();
    neonCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    neonCtx.fill();
  });
  neonCtx.globalCompositeOperation = 'source-over';
}

// start/stop neon and analyser when audio plays/pauses
const _attachNeonHooks = (() => {
  let hooked = false;
  return () => {
    if (hooked) return;
    const a = audio();
    if (!a) return;
    a.addEventListener('play', () => startNeon());
    a.addEventListener('pause', () => stopNeon());
    a.addEventListener('ended', () => stopNeon());
    hooked = true;
  };
})();

// attach analyser+neon hooks together so both systems run on audio play
const attachAudioHooks = (() => {
  let hooked = false;
  return () => {
    if (hooked) return;
    const a = audio();
    if (!a) return;
    a.addEventListener('play', () => {
      // start both analyser and neon
      startAudioReactive();
      startNeon();
    });
    a.addEventListener('pause', () => {
      stopAudioReactive();
      stopNeon();
    });
    a.addEventListener('ended', () => {
      stopAudioReactive();
      stopNeon();
    });
    // also ensure neon hooks (for any other listeners) are attached
    _attachNeonHooks();
    hooked = true;
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  attachAudioHooks();
});

// visualizer removed

// Hook into audio element play/pause so visualizer follows
// ensure hook runs during init: audio reactive and neon hooks are attached elsewhere

// Make globals available everywhere
window.navigate = navigate;
window.maybePopup = maybePopup;
window.closePopup = closePopup;
window.revealNext = revealNext;
window.shareCopy = shareCopy;
