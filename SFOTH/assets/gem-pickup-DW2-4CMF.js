(() => {
  "use strict";

  const audioVoices = new Map();
  let nextVoiceIndex = 0;
  const collect = (gem, soundUrl = "/media/site-sounds/gem-pickup-261.mp3") => {
    animateGemCollection(gem);
    playGemCollectSound(soundUrl);
  };

function animateGemCollection(sourceGem) {
  const target = document.querySelector("[data-gem-balance]");
  const sourceGlyph = sourceGem.querySelector(".economy-gem-glyph");
  if (!target || !sourceGlyph) {
    stashGemInBalance(target);
    return;
  }

  const sourceRect = sourceGlyph.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const clone = sourceGlyph.cloneNode(true);
  clone.className = "gem-fly-clone pixel-perfect-svg pixel-perfect-svg-mask";
  clone.setAttribute("aria-hidden", "true");

  let x = sourceRect.left;
  let y = sourceRect.top;
  const launchAngle = Math.random() * Math.PI * 2;
  const launchSpeed = 820 + Math.random() * 420;
  let vx = Math.cos(launchAngle) * launchSpeed;
  let vy = Math.sin(launchAngle) * launchSpeed;
  let rotation = -180 + Math.random() * 360;
  const spinDirection = Math.random() > 0.5 ? 1 : -1;
  let spin = spinDirection * (420 + Math.random() * 900);
  let previousTime = performance.now();
  const startedAt = previousTime;

  clone.style.opacity = "1";
  clone.style.transform = `translate3d(${x}px, ${y}px, 0) scale(0.94) rotate(${rotation}deg)`;
  document.body.append(clone);

  const step = (time) => {
    const dt = Math.min(0.034, Math.max(0.001, (time - previousTime) / 1000));
    previousTime = time;
    const nextTargetRect = target.getBoundingClientRect();
    const targetX = nextTargetRect.left + nextTargetRect.width / 2 - sourceRect.width / 2;
    const targetY = nextTargetRect.top + nextTargetRect.height / 2 - sourceRect.height / 2;
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = Math.hypot(vx, vy);
    const gravity = Math.min(5000, 900 + distance * 10);
    const drag = Math.exp(-2.35 * dt);
    const swirl = Math.sin((time - startedAt) / 140) * 110;

    vx = (vx + (dx / distance) * gravity * dt + (-dy / distance) * swirl * dt) * drag;
    vy = (vy + (dy / distance) * gravity * dt + (dx / distance) * swirl * dt) * drag;
    x += vx * dt;
    y += vy * dt;
    spin *= Math.exp(-0.44 * dt);
    rotation += spin * dt;

    if ((distance < 12 && speed < 260) || time - startedAt > 3200) {
      clone.remove();
      stashGemInBalance(target);
      return;
    }

    const scale = distance < 64 ? Math.max(0.32, distance / 78) : 1;
    clone.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`;
    window.requestAnimationFrame(step);
  };

  window.requestAnimationFrame(step);
}

function stashGemInBalance(target) {
  if (!target) {
    return;
  }

  target.classList.remove("is-stashing");
  void target.offsetWidth;
  target.classList.add("is-stashing");
  createGemStashSparks(target);
  window.setTimeout(() => target.classList.remove("is-stashing"), 620);
}

function createGemStashSparks(target) {
  const rect = target.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let index = 0; index < 7; index++) {
    const spark = document.createElement("span");
    const angle = -Math.PI / 2 + (index - 3) * 0.42;
    const distance = 22 + Math.random() * 18;
    spark.className = "gem-stash-spark";
    spark.setAttribute("aria-hidden", "true");
    spark.style.left = `${originX}px`;
    spark.style.top = `${originY}px`;
    spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
    document.body.append(spark);
    window.requestAnimationFrame(() => spark.classList.add("is-active"));
    window.setTimeout(() => spark.remove(), 520);
  }
}

function playGemCollectSound(source) {
  let voices = audioVoices.get(source);
  if (!voices) {
    voices = Array.from({ length: 4 }, () => {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = 0.72;
      return audio;
    });
    audioVoices.set(source, voices);
  }
  const availableVoice = voices.find((voice) => voice.paused || voice.ended);
  const voiceIndex = nextVoiceIndex;
  const voice = availableVoice || voices[voiceIndex % voices.length];
  nextVoiceIndex = (voiceIndex + 1) % voices.length;

  try {
    voice.currentTime = 0;
    voice.play().catch(() => {});
  } catch {
    // Audio pickup feedback is best-effort and must never block collecting the Gem.
  }
}

  window.ShedletskyGems = window.ShedletskyGems || {};
  window.ShedletskyGems.pickup = Object.freeze({ collect });
})();
