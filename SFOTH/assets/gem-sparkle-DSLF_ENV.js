(() => {
  "use strict";

  const GEM_SELECTOR = ".hidden-gem.is-sparkly";
  const INITIAL_DELAY_RANGE = [700, 6200];
  const REPEAT_DELAY_RANGE = [4400, 10400];
  const PULSE_DURATION_RANGE = [500, 760];
  const ENCORE_CHANCE = 0.28;
  const states = new Map();

  const randomBetween = (minimum, maximum) => minimum + (Math.random() * (maximum - minimum));
  const randomCssNumber = (minimum, maximum, digits = 2) => randomBetween(minimum, maximum).toFixed(digits);
  const scaledDuration = (milliseconds) => {
    const scale = window.SohEngine?.animationDuration;
    return typeof scale === "function" ? scale(milliseconds) : milliseconds;
  };

  const isEligible = (gem) => gem.isConnected &&
    gem.matches(GEM_SELECTOR) &&
    !gem.disabled &&
    !gem.classList.contains("is-pending") &&
    !gem.classList.contains("is-collected");

  const clearTimer = (state) => {
    if (state?.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = 0;
    }
  };

  const clearPulse = (gem) => {
    gem.classList.remove("is-sparkling", "is-sparkle-double");
  };

  const unregister = (gem) => {
    const state = states.get(gem);
    clearTimer(state);
    clearPulse(gem);
    states.delete(gem);
  };

  const schedule = (gem, initial = false) => {
    if (!gem.isConnected || !gem.matches(GEM_SELECTOR)) {
      unregister(gem);
      return;
    }

    let state = states.get(gem);
    if (!state) {
      state = { timerId: 0 };
      states.set(gem, state);
    }

    clearTimer(state);
    if (document.visibilityState === "hidden") {
      return;
    }

    const range = initial ? INITIAL_DELAY_RANGE : REPEAT_DELAY_RANGE;
    state.timerId = window.setTimeout(
      () => pulse(gem),
      scaledDuration(randomBetween(range[0], range[1])));
  };

  const writeSparkleVariables = (gem, duration, hasEncore) => {
    const x = randomBetween(38, 68);
    const y = randomBetween(15, 48);
    const encoreX = Math.max(30, Math.min(72, x + randomBetween(-20, 20)));
    const encoreY = Math.max(15, Math.min(58, y + randomBetween(9, 24)));

    gem.style.setProperty("--gem-sparkle-x", `${x.toFixed(1)}%`);
    gem.style.setProperty("--gem-sparkle-y", `${y.toFixed(1)}%`);
    gem.style.setProperty("--gem-sparkle-size", `${randomCssNumber(0.28, 0.41)}rem`);
    gem.style.setProperty("--gem-sparkle-scale", randomCssNumber(1.08, 1.48));
    gem.style.setProperty("--gem-sparkle-rotation", `${randomCssNumber(-28, 38, 1)}deg`);
    gem.style.setProperty("--gem-sparkle-drift-x", `${randomCssNumber(-0.07, 0.08)}rem`);
    gem.style.setProperty("--gem-sparkle-drift-y", `${randomCssNumber(-0.1, -0.035)}rem`);
    gem.style.setProperty("--gem-sparkle-duration", `${duration.toFixed(0)}ms`);

    if (!hasEncore) {
      return;
    }

    gem.style.setProperty("--gem-sparkle-encore-x", `${encoreX.toFixed(1)}%`);
    gem.style.setProperty("--gem-sparkle-encore-y", `${encoreY.toFixed(1)}%`);
    gem.style.setProperty("--gem-sparkle-encore-size", `${randomCssNumber(0.15, 0.23)}rem`);
    gem.style.setProperty("--gem-sparkle-encore-scale", randomCssNumber(0.88, 1.2));
    gem.style.setProperty("--gem-sparkle-encore-rotation", `${randomCssNumber(-24, 30, 1)}deg`);
    gem.style.setProperty("--gem-sparkle-encore-drift-x", `${randomCssNumber(-0.06, 0.05)}rem`);
    gem.style.setProperty("--gem-sparkle-encore-drift-y", `${randomCssNumber(-0.08, -0.025)}rem`);
    gem.style.setProperty("--gem-sparkle-encore-duration", `${randomBetween(390, 560).toFixed(0)}ms`);
    gem.style.setProperty("--gem-sparkle-encore-delay", `${randomBetween(140, 280).toFixed(0)}ms`);
  };

  function pulse(gem) {
    if (!(gem instanceof Element) || !isEligible(gem)) {
      if (gem?.isConnected && gem?.matches?.(GEM_SELECTOR)) {
        schedule(gem);
      } else if (gem instanceof Element) {
        unregister(gem);
      }
      return false;
    }

    const state = states.get(gem) || { timerId: 0 };
    states.set(gem, state);
    clearTimer(state);
    clearPulse(gem);

    const duration = randomBetween(PULSE_DURATION_RANGE[0], PULSE_DURATION_RANGE[1]);
    const hasEncore = Math.random() < ENCORE_CHANCE;
    writeSparkleVariables(gem, duration, hasEncore);

    // Force a style boundary so an explicit pulse can restart a currently fading glint.
    void gem.offsetWidth;
    gem.classList.toggle("is-sparkle-double", hasEncore);
    gem.classList.add("is-sparkling");

    const encoreTail = hasEncore ? 700 : 0;
    state.timerId = window.setTimeout(() => {
      clearPulse(gem);
      schedule(gem);
    }, scaledDuration(duration + encoreTail + 80));
    return true;
  }

  const register = (gem) => {
    if (!(gem instanceof Element) || !gem.matches(GEM_SELECTOR) || states.has(gem)) {
      return;
    }

    states.set(gem, { timerId: 0 });
    schedule(gem, true);
  };

  const refresh = (root = document) => {
    if (root instanceof Element && root.matches(GEM_SELECTOR)) {
      register(root);
    }
    root.querySelectorAll?.(GEM_SELECTOR).forEach(register);
  };

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          refresh(node);
        }
      });
      record.removedNodes.forEach((node) => {
        if (!(node instanceof Element)) {
          return;
        }
        if (states.has(node)) {
          unregister(node);
        }
        node.querySelectorAll?.(GEM_SELECTOR).forEach(unregister);
      });
    });
  });

  const rescheduleAll = () => {
    states.forEach((state, gem) => {
      clearTimer(state);
      clearPulse(gem);
      if (document.visibilityState !== "hidden") {
        schedule(gem, true);
      }
    });
  };

  const start = () => {
    refresh(document);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener("visibilitychange", rescheduleAll);
    document.addEventListener("shedletsky:animation-speed-change", rescheduleAll);
  };

  const destroy = () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", rescheduleAll);
    document.removeEventListener("shedletsky:animation-speed-change", rescheduleAll);
    states.forEach((_state, gem) => unregister(gem));
  };

  window.ShedletskyGems = window.ShedletskyGems || {};
  window.ShedletskyGems.sparkles = Object.freeze({ refresh, pulse, destroy });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
