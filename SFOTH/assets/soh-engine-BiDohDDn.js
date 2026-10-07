(() => {
  const SOURCE_WIDTH = 10;
  const SOURCE_HEIGHT = 12;
  const TERMINAL_FONT_WIDTH = 8;
  const TERMINAL_FONT_HEIGHT = 14;
  const LEGACY_HAT_ATTACHMENT_ANCHOR_Y = 0.72;
  const STX_CROWN_CODE = 206;
  const TERMINAL_FONT_URL = "/media/legacy-theme/fonts/ega8-f14.bin";
  const YELLOW = "#ffff55";
  const RED = "#ff2222";
  const CHARACTER_STORAGE_KEY = "shedletsky.soh.lab.character";
  const CHARACTER_LIBRARY_KEY = "shedletsky.soh.lab.characters";
  const SCENE_LIBRARY_KEY = "shedletsky.soh.lab.scenes";
  const MOTION_STORAGE_KEY = "shedletsky.soh.motion";
  const ANIMATION_SPEED_STORAGE_KEY = "shedletsky.animation.speed";
  const ANIMATION_SPEED_QUERY_PARAM = "sohAnimationSpeed";
  const READING_PREFERENCES_ELEMENT_ID = "shedletsky-reading-preferences-json";
  const DEFAULT_READING_SPEED_PERCENT = 100;
  const MIN_READING_SPEED_PERCENT = 25;
  const MAX_READING_SPEED_PERCENT = 400;
  const DEFAULT_DIALOGUE_DWELL_BASE_MS = 900;
  const DEFAULT_DIALOGUE_DWELL_PER_CHAR_MS = 42;
  const DEFAULT_DIALOGUE_DWELL_PUNCTUATION_MS = 180;
  const DEFAULT_DIALOGUE_DWELL_MIN_MS = 1400;
  const DEFAULT_DIALOGUE_DWELL_MAX_MS = 12000;
  const MOTION_ALLOW = "allow";
  const MOTION_REDUCE = "reduce";
  const REDUCED_MOTION_QUERY_PARAM = "sohReducedMotion";
  const SCENE_PIXEL_RATIO_CAPPED = "capped";
  const SCENE_PIXEL_RATIO_NATIVE = "native";
  const DEFAULT_SCENE_MAX_PIXEL_RATIO = 2;

  const vgaPalette = [
    "000000", "0000AA", "00AA00", "00AAAA", "AA0000", "AA00AA", "AA5500", "AAAAAA", "555555", "5555FF", "55FF55", "55FFFF", "FF5555", "FF55FF", "FFFF55", "FFFFFF",
    "000000", "141414", "202020", "2C2C2C", "383838", "454545", "515151", "616161", "717171", "828282", "929292", "A2A2A2", "B6B6B6", "CBCBCB", "E3E3E3", "FFFFFF",
    "0000FF", "4100FF", "7D00FF", "BE00FF", "FF00FF", "FF00BE", "FF007D", "FF0041", "FF0000", "FF4100", "FF7D00", "FFBE00", "FFFF00", "BEFF00", "7DFF00", "41FF00",
    "00FF00", "00FF41", "00FF7D", "00FFBE", "00FFFF", "00BEFF", "007DFF", "0041FF", "7D7DFF", "9E7DFF", "BE7DFF", "DF7DFF", "FF7DFF", "FF7DDF", "FF7DBE", "FF7D9E",
    "FF7D7D", "FF9E7D", "FFBE7D", "FFDF7D", "FFFF7D", "DFFF7D", "BEFF7D", "9EFF7D", "7DFF7D", "7DFF9E", "7DFFBE", "7DFFDF", "7DFFFF", "7DDFFF", "7DBEFF", "7D9EFF",
    "B6B6FF", "C7B6FF", "DBB6FF", "EBB6FF", "FFB6FF", "FFB6EB", "FFB6DB", "FFB6C7", "FFB6B6", "FFC7B6", "FFDBB6", "FFEBB6", "FFFFB6", "EBFFB6", "DBFFB6", "C7FFB6",
    "B6FFB6", "B6FFC7", "B6FFDB", "B6FFEB", "B6FFFF", "B6EBFF", "B6DBFF", "B6C7FF", "000071", "1C0071", "380071", "550071", "710071", "710055", "710038", "71001C",
    "710000", "711C00", "713800", "715500", "717100", "557100", "387100", "1C7100", "007100", "00711C", "007138", "007155", "007171", "005571", "003871", "001C71",
    "383871", "453871", "553871", "613871", "713871", "713861", "713855", "713845", "713838", "714538", "715538", "716138", "717138", "617138", "557138", "457138",
    "387138", "387145", "387155", "387161", "387171", "386171", "385571", "384571", "515171", "595171", "615171", "695171", "715171", "715169", "715161", "715159",
    "715151", "715951", "716151", "716951", "717151", "697151", "617151", "597151", "517151", "517159", "517161", "517169", "517171", "516971", "516171", "515971",
    "000041", "100041", "200041", "300041", "410041", "410030", "410020", "410010", "410000", "411000", "412000", "413000", "414100", "304100", "204100", "104100",
    "004100", "004110", "004120", "004130", "004141", "003041", "002041", "001041", "202041", "282041", "302041", "382041", "412041", "412038", "412030", "412028",
    "412020", "412820", "413020", "413820", "414120", "384120", "304120", "284120", "204120", "204128", "204130", "204138", "204141", "203841", "203041", "202841",
    "2C2C41", "302C41", "342C41", "3C2C41", "412C41", "412C3C", "412C34", "412C30", "412C2C", "41302C", "41342C", "413C2C", "41412C", "3C412C", "34412C", "30412C",
    "2C412C", "2C4130", "2C4134", "2C413C", "2C4141", "2C3C41", "2C3441", "2C3041", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000"
  ].map((hex, index) => ({ index, hex: `#${hex}` }));

  const sohRows = [
    "..........",
    "..######..",
    ".#......#.",
    ".#.#..#.#.",
    ".#......#.",
    ".#......#.",
    ".#.####.#.",
    ".#..##..#.",
    ".#......#.",
    ".#......#.",
    "..######..",
    ".........."
  ];
  const stxRows = [
    "..........",
    "..######..",
    ".########.",
    ".########.",
    ".########.",
    ".########.",
    ".########.",
    ".########.",
    ".########.",
    ".########.",
    "..######..",
    ".........."
  ];
  const baseEyes = [{ x: 3, y: 3 }, { x: 6, y: 3 }];
  const mouthFrames = {
    smile: [
      { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      { x: 4, y: 7 }, { x: 5, y: 7 }
    ],
    hmm: [
      { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }
    ],
    surprise: [
      { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 3, y: 6 }, { x: 6, y: 6 },
      { x: 3, y: 7 }, { x: 6, y: 7 },
      { x: 4, y: 8 }, { x: 5, y: 8 }
    ],
    unhappy: [
      { x: 4, y: 6 }, { x: 5, y: 6 },
      { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }
    ],
    singWide: [
      { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
      { x: 3, y: 6 }, { x: 6, y: 6 },
      { x: 3, y: 7 }, { x: 6, y: 7 },
      { x: 4, y: 8 }, { x: 5, y: 8 }
    ]
  };

  const defaultCharacterDefinition = {
    version: 1,
    id: "soh-default",
    name: "Soh",
    glyph: "soh",
    colors: { skin: 14, hat: 14 },
    attachments: {
      hat: {
        enabled: false,
        slot: "head",
        type: "glyph",
        code: 0x5e,
        fit: "hat",
        tilt: 12,
        spring: true
      }
    }
  };

  const glyphVariants = {
    soh: createGlyphVariant("SOH", sohRows, "positive"),
    stx: createGlyphVariant("STX", stxRows, "negative")
  };
  const baseEyeKeys = new Set(baseEyes.map((eye) => `${eye.x},${eye.y}`));
  const baseMouthKeys = new Set(Object.values(mouthFrames).flat().map((pixel) => `${pixel.x},${pixel.y}`));
  Object.values(glyphVariants).forEach((glyph) => {
    glyph.bodyPixels = glyph.sourcePixels.filter((pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      return glyph.faceMode !== "positive" || (!baseEyeKeys.has(key) && !baseMouthKeys.has(key));
    });
  });

  class SceneDirector {
    constructor(now = performance.now()) {
      this.startedAt = now;
      this.actions = [];
    }

    at(startMs, durationMs, name, update) {
      this.actions.push({ startMs, durationMs, name, update });
      return this;
    }

    apply(now, context) {
      const elapsed = now - this.startedAt;
      this.actions.forEach((action) => {
        const progress = clamp((elapsed - action.startMs) / action.durationMs, 0, 1);
        if (progress <= 0 || progress >= 1 && elapsed > action.startMs + action.durationMs) {
          return;
        }
        action.update(progress, context, elapsed);
      });
    }
  }

  class StorageLibrary {
    constructor(key, normalize) {
      this.key = key;
      this.normalize = normalize || ((value) => value);
    }

    all() {
      try {
        const parsed = JSON.parse(window.localStorage?.getItem(this.key) || "[]");
        return Array.isArray(parsed) ? parsed.map((item) => this.normalize(item)).filter(Boolean) : [];
      } catch {
        return [];
      }
    }

    save(item) {
      const normalized = this.normalize(item);
      if (!normalized) {
        return [];
      }
      const items = this.all().filter((candidate) => candidate.id !== normalized.id);
      items.push(normalized);
      this.write(items);
      return items;
    }

    remove(id) {
      const items = this.all().filter((item) => item.id !== id);
      this.write(items);
      return items;
    }

    write(items) {
      try {
        window.localStorage?.setItem(this.key, JSON.stringify(items));
      } catch {
        // The Lab can still use the in-memory return values when storage is unavailable.
      }
    }
  }

  function characterItemAttachments(asset) {
    if (!Array.isArray(asset?.glyphs) || !asset.glyphs.length) return [];
    // Preserve the forge's whole attachment frame; glyphs rotate around their
    // centers inside it. Flattening them loses frame rotation and small scales.
    return [{ type: "catalogItem", slot: asset.attachmentFrame?.slot || "head", layer: "front", asset }];
  }

  function normalizeCharacterDefinition(character) {
    const normalized = {
      ...clone(defaultCharacterDefinition),
      ...(character && typeof character === "object" ? character : {})
    };
    normalized.version = 1;
    normalized.id = typeof normalized.id === "string" && normalized.id.trim()
      ? slugify(normalized.id)
      : `soh-${Date.now().toString(36)}`;
    normalized.name = typeof normalized.name === "string" && normalized.name.trim() ? normalized.name.trim() : "Soh";
    normalized.glyph = glyphVariants[normalized.glyph] ? normalized.glyph : "soh";
    normalized.colors = {
      ...clone(defaultCharacterDefinition.colors),
      ...(normalized.colors && typeof normalized.colors === "object" ? normalized.colors : {})
    };
    normalized.colors.skin = normalizeVgaIndex(normalized.colors.skin, defaultCharacterDefinition.colors.skin);
    normalized.colors.hat = normalizeVgaIndex(normalized.colors.hat, defaultCharacterDefinition.colors.hat);
    normalized.attachments = {
      ...clone(defaultCharacterDefinition.attachments),
      ...(normalized.attachments && typeof normalized.attachments === "object" ? normalized.attachments : {})
    };
    normalized.attachments.hat = {
      ...clone(defaultCharacterDefinition.attachments.hat),
      ...(normalized.attachments.hat && typeof normalized.attachments.hat === "object" ? normalized.attachments.hat : {})
    };
    normalized.attachments.hat.enabled = Boolean(normalized.attachments.hat.enabled);
    normalized.attachments.hat.code = clamp(Math.round(Number(normalized.attachments.hat.code) || 0), 0, 255);
    normalized.attachments.hat.tilt = clamp(Number(normalized.attachments.hat.tilt) || 0, -24, 24);
    return normalized;
  }

  function normalizeScenePreset(scene) {
    if (!scene || typeof scene !== "object") {
      return null;
    }
    return {
      version: 1,
      id: typeof scene.id === "string" && scene.id.trim() ? slugify(scene.id) : `scene-${Date.now().toString(36)}`,
      name: typeof scene.name === "string" && scene.name.trim() ? scene.name.trim() : "Soh Scene",
      mode: typeof scene.mode === "string" && scene.mode.trim() ? scene.mode.trim() : "mouse",
      character: normalizeCharacterDefinition(scene.character || defaultCharacterDefinition),
      savedAt: scene.savedAt || new Date().toISOString()
    };
  }

  function readJsonInput(textValue) {
    const parsed = JSON.parse(textValue);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  function createOverlayLayer(className = "soh-layer soh-layer-page") {
    const layer = document.createElement("div");
    layer.className = className;
    layer.setAttribute("aria-hidden", "true");
    document.body.append(layer);
    return layer;
  }

  function createPanelLayer(panel) {
    const layer = document.createElement("div");
    layer.className = "soh-layer soh-layer-panel";
    layer.setAttribute("aria-hidden", "true");
    panel.classList.add("soh-panel-host");
    panel.prepend(layer);
    return layer;
  }

  function domTargets() {
    return {
      brandMark: document.querySelector(".brand-mark"),
      masthead: document.querySelector(".legacy-masthead"),
      posts: [...document.querySelectorAll(".post-row")],
      titles: [...document.querySelectorAll(".post-title, h1, h2")],
      rectFor(element) {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          element
        };
      }
    };
  }

  function motionPreference(queryParam = REDUCED_MOTION_QUERY_PARAM) {
    const preference = readStorage(MOTION_STORAGE_KEY);
    if (preference === MOTION_ALLOW) {
      return false;
    }
    if (preference === MOTION_REDUCE) {
      return true;
    }
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ||
      new URLSearchParams(window.location.search).has(queryParam);
  }

  function writeMotionPreference(value) {
    writeStorage(MOTION_STORAGE_KEY, value);
  }

  function clampAnimationSpeed(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 1;
    }
    return clamp(parsed, 0.05, 4);
  }

  function readAnimationSpeedPreference() {
    const query = new URLSearchParams(window.location.search).get(ANIMATION_SPEED_QUERY_PARAM);
    if (query !== null) {
      return clampAnimationSpeed(query);
    }

    const stored = readStorage(ANIMATION_SPEED_STORAGE_KEY);
    return stored === null ? 1 : clampAnimationSpeed(stored);
  }

  function animationSpeed() {
    return readAnimationSpeedPreference();
  }

  function animationDuration(ms) {
    const duration = Math.max(0, Number(ms) || 0);
    return duration / animationSpeed();
  }

  function animationDelay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, animationDuration(ms)));
  }

  function writeAnimationSpeed(value) {
    const speed = clampAnimationSpeed(value);
    writeStorage(ANIMATION_SPEED_STORAGE_KEY, String(speed));
    applyAnimationSpeed(speed);
    return speed;
  }

  function applyAnimationSpeed(value = animationSpeed()) {
    const speed = clampAnimationSpeed(value);
    document.documentElement.style.setProperty("--shedletsky-animation-speed", String(speed));
    document.documentElement.style.setProperty("--shedletsky-animation-duration-factor", String(1 / speed));
    document.documentElement.dataset.animationSpeed = String(speed);
    document.dispatchEvent(new CustomEvent("shedletsky:animation-speed-change", { detail: { speed } }));
    return speed;
  }

  function sourcePointToWorld(state, point) {
    const pivotX = state.pivotX * state.scale;
    const pivotY = state.pivotY * state.scale;
    let x = point.x * state.scale - pivotX;
    let y = point.y * state.scale - pivotY;
    x *= state.scaleX ?? 1;
    y *= state.scaleY ?? 1;
    x += (state.skewX || 0) * y;
    const rotation = state.rotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: state.x + pivotX + cos * x - sin * y,
      y: state.y + pivotY + sin * x + cos * y
    };
  }

  function buildTerminalGlyphPixels(bytes) {
    return Array.from({ length: 256 }, (_, code) => {
      const glyphOffset = code * TERMINAL_FONT_HEIGHT;
      const pixels = [];
      for (let row = 0; row < TERMINAL_FONT_HEIGHT; row += 1) {
        const scanline = bytes[glyphOffset + row];
        for (let column = 0; column < TERMINAL_FONT_WIDTH; column += 1) {
          if ((scanline & (0x80 >> column)) !== 0) {
            pixels.push({ x: column, y: row });
          }
        }
      }
      return pixels;
    });
  }

  async function loadTerminalFont(url = TERMINAL_FONT_URL) {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length === 256 * TERMINAL_FONT_HEIGHT ? bytes : null;
  }

  class TerminalTextRenderer {
    constructor(ctx, bytes, options = {}) {
      this.ctx = ctx;
      this.bytes = bytes;
      this.width = options.width || TERMINAL_FONT_WIDTH;
      this.height = options.height || TERMINAL_FONT_HEIGHT;
      this.glyphPixels = options.glyphPixels || buildTerminalGlyphPixels(bytes);
      this.advance = options.advance || this.width + 1;
      this.lineAdvance = options.lineAdvance || this.height + 2;
    }

    setContext(ctx) {
      this.ctx = ctx;
      return this;
    }

    metrics(scale = 1) {
      return {
        glyphWidth: this.width * scale,
        glyphHeight: this.height * scale,
        advance: this.advance * scale,
        lineAdvance: this.lineAdvance * scale,
        gap: (this.advance - this.width) * scale,
        lineGap: (this.lineAdvance - this.height) * scale
      };
    }

    measure(lines, scale = 1) {
      const normalized = normalizeTextLines(lines);
      const metrics = this.metrics(scale);
      const maxLine = normalized.reduce((max, line) => Math.max(max, line.length), 0);
      return {
        width: maxLine > 0 ? maxLine * metrics.advance - metrics.gap : 0,
        height: normalized.length > 0 ? normalized.length * metrics.lineAdvance - metrics.lineGap : 0,
        lines: normalized.length
      };
    }

    drawGlyph(code, x, y, scale = 1, color = YELLOW) {
      const pixels = this.glyphPixels?.[code & 0xff];
      if (!this.ctx || !pixels) {
        return;
      }
      this.ctx.fillStyle = color;
      pixels.forEach((pixel) => {
        this.ctx.fillRect(x + pixel.x * scale, y + pixel.y * scale, scale, scale);
      });
    }

    drawCodeLine(codes, x, y, scale = 1, color = YELLOW, options = {}) {
      const advance = options.advance ?? this.width;
      codes.forEach((code, index) => {
        this.drawGlyph(code, x + index * advance * scale, y, scale, color);
      });
    }

    drawText(lines, x, y, scale = 1, color = YELLOW, options = {}) {
      const normalized = normalizeTextLines(lines);
      const uppercase = options.uppercase !== false;
      const advance = options.advance ?? this.advance;
      const lineAdvance = options.lineAdvance ?? this.lineAdvance;
      normalized.forEach((lineText, lineIndex) => {
        const chars = (uppercase ? lineText.toUpperCase() : lineText).split("");
        chars.forEach((char, charIndex) => {
          this.drawGlyph(
            char.charCodeAt(0) & 0xff,
            x + charIndex * advance * scale,
            y + lineIndex * lineAdvance * scale,
            scale,
            color
          );
        });
      });
    }
  }

  async function createTerminalTextRenderer(ctx, options = {}) {
    const bytes = options.bytes || await loadTerminalFont(options.url || TERMINAL_FONT_URL);
    return bytes ? new TerminalTextRenderer(ctx, bytes, options) : null;
  }

  function normalizeTextLines(lines) {
    if (Array.isArray(lines)) {
      return lines.map((line) => String(line));
    }
    return String(lines ?? "").split(/\r?\n/);
  }

  function createGlyphVariant(label, sourceRows, faceMode) {
    return {
      label,
      rows: sourceRows,
      faceMode,
      sourcePixels: pixelsForRows(sourceRows),
      attachments: {
        head: findTopRunAttachment(sourceRows),
        leftHand: findSideAttachment(sourceRows, "left"),
        rightHand: findSideAttachment(sourceRows, "right"),
        foot: findBottomRunAttachment(sourceRows)
      }
    };
  }

  function pixelsForRows(sourceRows) {
    return sourceRows.flatMap((row, y) =>
      row.split("").flatMap((value, x) => (value === "#" ? [{ x, y }] : []))
    );
  }

  function findTopRunAttachment(sourceRows) {
    const topY = sourceRows.findIndex((row) => row.includes("#"));
    if (topY < 0) {
      return { x: 5, y: 0 };
    }
    const xs = sourceRows[topY].split("").map((value, x) => (value === "#" ? x : null)).filter((x) => x !== null);
    return { x: (Math.min(...xs) + Math.max(...xs) + 1) / 2, y: topY + 0.18 };
  }

  function findSideAttachment(sourceRows, side) {
    const points = pixelsForRows(sourceRows);
    const edgeX = side === "left" ? Math.min(...points.map((point) => point.x)) : Math.max(...points.map((point) => point.x));
    const edgePoints = points.filter((point) => point.x === edgeX);
    const y = edgePoints.reduce((sum, point) => sum + point.y, 0) / edgePoints.length;
    return { x: edgeX + (side === "left" ? -0.42 : 1.42), y: y + 0.25 };
  }

  function findBottomRunAttachment(sourceRows) {
    let bottomY = sourceRows.length - 1;
    while (bottomY >= 0 && !sourceRows[bottomY].includes("#")) {
      bottomY -= 1;
    }
    if (bottomY < 0) {
      return { x: 5, y: 12 };
    }
    const xs = sourceRows[bottomY].split("").map((value, x) => (value === "#" ? x : null)).filter((x) => x !== null);
    return { x: (Math.min(...xs) + Math.max(...xs) + 1) / 2, y: bottomY + 1.04 };
  }

  function pseudoRandom(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeScenePixelRatioMode(value) {
    const exactRatio = Number(value);
    if (Number.isFinite(exactRatio) && exactRatio >= 1 && exactRatio <= 3) {
      return exactRatio;
    }

    return value === SCENE_PIXEL_RATIO_NATIVE
      ? SCENE_PIXEL_RATIO_NATIVE
      : SCENE_PIXEL_RATIO_CAPPED;
  }

  function normalizeSceneMaxPixelRatio(value) {
    const ratio = Number(value);
    return Number.isFinite(ratio) && ratio > 0
      ? ratio
      : DEFAULT_SCENE_MAX_PIXEL_RATIO;
  }

  function resolveScenePixelRatio(devicePixelRatio, mode, maxPixelRatio) {
    if (typeof mode === "number") {
      return mode;
    }

    const ratio = Number(devicePixelRatio);
    const nativeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    return mode === SCENE_PIXEL_RATIO_NATIVE
      ? nativeRatio
      : Math.min(nativeRatio, normalizeSceneMaxPixelRatio(maxPixelRatio));
  }

  function cycleProgress(elapsed, duration) {
    return (Math.max(0, elapsed) % duration) / duration;
  }

  function cycleIndex(elapsed, interval, count) {
    return Math.floor(Math.max(0, elapsed) / interval) % count;
  }

  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function easeInOut(value) {
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
  }

  function easeOutCubic(value) {
    const t = clamp(value, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function normalizeVgaIndex(value, fallback = 14) {
    const index = Math.round(Number(value));
    return Number.isFinite(index) ? clamp(index, 0, vgaPalette.length - 1) : fallback;
  }

  function vgaColor(index) {
    return (vgaPalette[normalizeVgaIndex(index)] || vgaPalette[14]).hex;
  }

  function colorWithAlpha(color, alpha) {
    const normalizedAlpha = clamp(Number(alpha), 0, 1);
    const value = String(color || YELLOW).trim();
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const raw = hex[1].length === 3
        ? hex[1].split("").map((part) => part + part).join("")
        : hex[1];
      const number = Number.parseInt(raw, 16);
      const r = (number >> 16) & 255;
      const g = (number >> 8) & 255;
      const b = number & 255;
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    }

    const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(",").map((part) => Number.parseFloat(part.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${normalizedAlpha})`;
      }
    }

    return `rgba(255, 255, 85, ${normalizedAlpha})`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slugify(value) {
    const slug = String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || `soh-${Date.now().toString(36)}`;
  }

  function readStorage(key) {
    try {
      return window.localStorage?.getItem(key) || null;
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // Storage is optional for Soh runtime preferences.
    }
  }

  function pointInRect(x, y, rect) {
    return Boolean(rect) &&
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height;
  }

  let readingPreferenceOverride = null;

  function clampReadingSpeedPercent(value) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) {
      return DEFAULT_READING_SPEED_PERCENT;
    }
    return clamp(parsed, MIN_READING_SPEED_PERCENT, MAX_READING_SPEED_PERCENT);
  }

  function normalizeReadingPreferences(value = {}) {
    return {
      readingSpeedPercent: clampReadingSpeedPercent(value.readingSpeedPercent ?? value.speedPercent),
      alwaysWait: value.alwaysWait === true
    };
  }

  function readHydratedReadingPreferences() {
    const node = document.getElementById(READING_PREFERENCES_ELEMENT_ID);
    if (!node) {
      return normalizeReadingPreferences();
    }

    try {
      return normalizeReadingPreferences(JSON.parse(node.textContent || "{}"));
    } catch {
      return normalizeReadingPreferences();
    }
  }

  function readingPreferences() {
    return normalizeReadingPreferences(readingPreferenceOverride || readHydratedReadingPreferences());
  }

  function readingSpeed() {
    return readingPreferences().readingSpeedPercent / 100;
  }

  function dialogueTextWeight(text) {
    const value = String(text ?? "").trim();
    if (!value) {
      return 0;
    }
    const lineBreaks = (value.match(/\n/g) || []).length;
    const punctuation = (value.match(/[.!?;:]/g) || []).length;
    const commas = (value.match(/[,]/g) || []).length;
    return value.length + lineBreaks * 12 + punctuation * 4 + commas * 2;
  }

  function dialogueDwellDuration(textOrMs, options = {}) {
    const legacyDuration = typeof textOrMs === "number" ? textOrMs : null;
    const text = legacyDuration === null ? String(textOrMs ?? "") : String(options.text ?? "");
    const baseDuration = Math.max(0, Number(options.baseDuration ?? DEFAULT_DIALOGUE_DWELL_BASE_MS) || 0);
    const perCharMs = Math.max(0, Number(options.perCharMs ?? DEFAULT_DIALOGUE_DWELL_PER_CHAR_MS) || 0);
    const punctuationMs = Math.max(0, Number(options.punctuationMs ?? DEFAULT_DIALOGUE_DWELL_PUNCTUATION_MS) || 0);
    const authoredMinimum = Math.max(0, Number(options.duration ?? options.minimum ?? legacyDuration ?? 0) || 0);
    const minimum = Math.max(
      Math.max(0, Number(options.minDuration ?? DEFAULT_DIALOGUE_DWELL_MIN_MS) || 0),
      authoredMinimum
    );
    const maximum = Math.max(minimum, Number(options.maxDuration ?? DEFAULT_DIALOGUE_DWELL_MAX_MS) || DEFAULT_DIALOGUE_DWELL_MAX_MS);
    const punctuationCount = (text.match(/[.!?;:,]/g) || []).length;
    const estimatedDuration = text
      ? baseDuration + dialogueTextWeight(text) * perCharMs + punctuationCount * punctuationMs
      : authoredMinimum || baseDuration;
    const duration = clamp(estimatedDuration, minimum, maximum);
    return duration / readingSpeed();
  }

  function shouldRequireDialogueContinue(step = {}) {
    if (step.alwaysWait !== undefined) {
      return step.alwaysWait !== false;
    }
    if (step.waitForContinue !== undefined) {
      return step.waitForContinue !== false;
    }
    return readingPreferences().alwaysWait;
  }

  function writeReadingPreferences(value = {}) {
    readingPreferenceOverride = normalizeReadingPreferences(value);
    document.documentElement.dataset.readingSpeedPercent = String(readingPreferenceOverride.readingSpeedPercent);
    document.documentElement.dataset.alwaysWait = String(readingPreferenceOverride.alwaysWait);
    document.dispatchEvent(new CustomEvent("shedletsky:reading-preferences-change", {
      detail: { preferences: readingPreferenceOverride }
    }));
    return readingPreferenceOverride;
  }

  function waitForKeyContinue() {
    return new Promise((resolve) => {
      const finish = () => {
        window.removeEventListener("keydown", onKeyDown);
        resolve();
      };
      const onKeyDown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        finish();
      };
      window.addEventListener("keydown", onKeyDown);
    });
  }

  const waitPrompts = {
    wait(options = {}) {
      const style = options.style || "terminal";
      const target = options.target instanceof HTMLElement ? options.target : document.body;
      if (!(target instanceof HTMLElement)) {
        return waitForKeyContinue();
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = options.className || `${style}-continue`;
      button.textContent = options.text || options.label || "> PRESS ENTER TO CONTINUE";
      button.dataset.waitPromptStyle = style;
      target.append(button);

      return new Promise((resolve) => {
        const finish = () => {
          button.removeEventListener("click", finish);
          window.removeEventListener("keydown", onKeyDown);
          button.remove();
          resolve();
        };
        const onKeyDown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }

          event.preventDefault();
          finish();
        };

        button.addEventListener("click", finish);
        window.addEventListener("keydown", onKeyDown);
      });
    }
  };

  function delay(ms, options = {}) {
    const duration = options.scaled === false ? Math.max(0, Number(ms) || 0) : animationDuration(ms);
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  function filledGlyphPixels(glyph) {
    if (!glyph?.rows) {
      return glyph?.bodyPixels || glyph?.sourcePixels || [];
    }

    return glyph.rows.flatMap((row, y) => {
      const columns = row.split("").map((value, x) => value === "#" ? x : null).filter((x) => x !== null);
      if (columns.length === 0) {
        return [];
      }

      const minX = Math.min(...columns);
      const maxX = Math.max(...columns);
      return Array.from({ length: maxX - minX + 1 }, (_, index) => ({ x: minX + index, y }));
    });
  }

  function pixelKey(pixel) {
    return `${pixel.x},${pixel.y}`;
  }

  function offsetFacePixels(pixels, offset = { x: 0, y: 0 }) {
    const dx = offset?.x || 0;
    const dy = offset?.y || 0;
    return (pixels || []).map((pixel) => ({ x: pixel.x + dx, y: pixel.y + dy }));
  }

  function normalizeCharacterGlow(value) {
    if (value === undefined || value === null || value === false) return null;
    if (typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !["color", "size", "intensity"].includes(key))) throw new TypeError("Invalid character glow; use color, size and intensity");
    const glow = { color: value.color ?? "#ffd676", size: value.size ?? 1.7, intensity: value.intensity ?? .75 };
    if (!/^#[0-9a-f]{6}$/i.test(glow.color) || !Number.isFinite(glow.size) || glow.size <= 0 || glow.size > 8 || !Number.isFinite(glow.intensity) || glow.intensity < 0 || glow.intensity > 1) throw new RangeError("Invalid character glow color, size or intensity");
    return glow;
  }

  class CharacterRenderer {
    constructor(ctx, options = {}) {
      this.ctx = ctx;
      this.glyphs = options.glyphs || glyphVariants;
      this.mouths = options.mouths || mouthFrames;
      this.colors = options.colors || { body: YELLOW, face: "#000000", crown: vgaColor(0x2b) };
      // Spatial adapters render the same glow on their own depth-safe effect
      // surface. It must never be baked into a depth-writing glyph texture.
      this.renderGlow = options.renderGlow !== false;
      this.terminalText = options.terminalText || null;
      this.terminalTextPromise = null;
      this.missingTerminalTextWarned = false;
      if (!this.terminalText && options.loadTerminalText !== false) {
        this.ensureTerminalText();
      }
    }

    setContext(ctx) {
      this.ctx = ctx;
      this.terminalText?.setContext?.(ctx);
      if (!this.terminalText) {
        this.ensureTerminalText();
      }
      return this;
    }

    setTerminalText(renderer) {
      this.terminalText = renderer || null;
      this.terminalText?.setContext?.(this.ctx);
      return this;
    }

    ensureTerminalText() {
      if (!this.ctx || this.terminalText || this.terminalTextPromise || typeof createTerminalTextRenderer !== "function") {
        return this.terminalTextPromise;
      }

      this.terminalTextPromise = createTerminalTextRenderer(this.ctx)
        .then((renderer) => {
          this.setTerminalText(renderer);
          this.missingTerminalTextWarned = false;
          return renderer;
        })
        .catch((error) => {
          console.error("SohEngine.CharacterRenderer could not initialize CP437 renderer.", error);
          return null;
        })
        .finally(() => {
          this.terminalTextPromise = null;
        });
      return this.terminalTextPromise;
    }

    glyphFor(state) {
      if (typeof state.glyph === "string") {
        return this.glyphs[state.glyph] || this.glyphs.soh;
      }

      return state.glyph || this.glyphs.soh;
    }

    // Physical standing height excludes the font cell's padding and attachments.
    // Measure the selected glyph, including custom glyphs, rather than Soh constants.
    bodyMetrics(state = {}) {
      const glyph = this.glyphFor(state);
      const pixels = glyph?.bodyPixels ?? glyph?.sourcePixels;
      if (!Array.isArray(pixels) || !pixels.length) throw new TypeError("Shared character glyph has no body pixels.");
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const pixel of pixels) {
        if (!Number.isFinite(pixel.x) || !Number.isFinite(pixel.y)) throw new TypeError("Invalid shared character body pixel.");
        left = Math.min(left, pixel.x); right = Math.max(right, pixel.x + 1);
        top = Math.min(top, pixel.y); bottom = Math.max(bottom, pixel.y + 1);
      }
      return { left, right, top, bottom, width: right - left, height: bottom - top, centerX: (left + right) / 2 };
    }

    // Unit glyph coordinates with the standing foot at the origin. Projection,
    // world scale and furniture docking remain the caller's responsibility.
    standingState(actor = {}, { facing = 1 } = {}) {
      if (![-1, 0, 1].includes(facing)) throw new TypeError("Invalid shared character facing.");
      const { centerX, bottom } = this.bodyMetrics(actor);
      return { ...actor, x: -centerX, y: -bottom, scale: 1, scaleX: 1, scaleY: 1,
        rotation: 0, skewX: 0, pivotX: centerX, pivotY: bottom,
        shadowBlur: actor.shadowBlur ?? 0, eyeOffset: actor.eyeOffset ?? { x: facing, y: 0 } };
    }

    mouthFor(state, now) {
      if (Array.isArray(state.mouth)) {
        return state.mouth;
      }
      const defaultMouth = state.mouth && this.mouths[state.mouth]
        ? this.mouths[state.mouth]
        : state.crown ? this.mouths.unhappy : this.mouths.smile;
      if (state.speakingUntil && now < state.speakingUntil) {
        const policy = state.mouthPolicy || state.talkIntensity || "full";
        if (policy === "none") {
          return defaultMouth;
        }
        if (policy === "subtle") {
          const elapsed = state.spokenAt ? now - state.spokenAt : 0;
          const shouldMove = elapsed < 220 || (elapsed > 620 && elapsed % 1150 < 150);
          if (!shouldMove) {
            return defaultMouth;
          }
          return cycleIndex(now, state.mouthInterval || 180, 2) === 0 ? this.mouths.hmm : this.mouths.unhappy;
        }
        return cycleIndex(now, state.mouthInterval || 130, 2) === 0 ? this.mouths.hmm : this.mouths.unhappy;
      }
      return defaultMouth;
    }

    paintFor(state, glyph) {
      const bodyColor = state.bodyColor || this.colors.body;
      const fillInterior = typeof state.fillInterior === "boolean"
        ? state.fillInterior
        : glyph.faceMode === "negative";
      const bodyPixels = fillInterior
        ? filledGlyphPixels(glyph)
        : glyph.bodyPixels || glyph.sourcePixels || [];
      const customFaceColor = state.allowCustomFaceColor === true ? state.faceColor : null;
      const defaultFaceColor = glyph.faceMode === "positive" && !fillInterior
        ? bodyColor
        : this.colors.face || "#000000";
      const eyeColor = state.eyeColor || customFaceColor || defaultFaceColor;
      const mouthColor = glyph.faceMode === "negative" && state.allowCustomMouthColor !== true
        ? this.colors.face || "#000000"
        : state.mouthColor || customFaceColor || defaultFaceColor;

      return {
        bodyColor,
        bodyPixels,
        fillInterior,
        faceMaskColor: state.faceMaskColor || this.colors.face || "#000000",
        eyeColor,
        mouthColor
      };
    }

    faceMaskPixelsFor(state, glyph, paint, eyePixels, mouth) {
      if (state.faceMask === false || state.interiorMask === false) {
        return [];
      }

      if (glyph.faceMode === "positive" && !paint.fillInterior) {
        const bodyKeys = new Set((glyph.bodyPixels || glyph.sourcePixels || []).map(pixelKey));
        return filledGlyphPixels(glyph).filter((pixel) => !bodyKeys.has(pixelKey(pixel)));
      }

      if (glyph.faceMode === "negative") {
        return [
          ...offsetFacePixels(eyePixels, state.eyeOffset),
          ...(mouth || [])
        ];
      }

      return [];
    }

    actorBounds(state) {
      const scale = state.scale || 1;
      return {
        x: state.x,
        y: state.y,
        width: SOURCE_WIDTH * scale,
        height: SOURCE_HEIGHT * scale
      };
    }

    glowFor(state) {
      const glow = normalizeCharacterGlow(state.glow);
      if (!glow || !glow.intensity || state.visible === false || state.alpha === 0) return null;
      const glyph = this.glyphFor(state), pixels = glyph.bodyPixels || glyph.sourcePixels;
      const left = Math.min(...pixels.map(p => p.x)), right = Math.max(...pixels.map(p => p.x + 1));
      const top = Math.min(...pixels.map(p => p.y)), bottom = Math.max(...pixels.map(p => p.y + 1));
      return { ...glow, intensity: glow.intensity * (state.alpha ?? 1), centerX: (left + right) / 2, centerY: (top + bottom) / 2, diameter: (bottom - top) * glow.size, falloff: 11 };
    }

    glowQuad(state) {
      const glow = this.glowFor(state);
      if (!glow) return null;
      const half = glow.diameter / 2, scale = state.scale || 1, px = state.pivotX ?? 5, py = state.pivotY ?? 6;
      const c = Math.cos(state.rotation || 0), s = Math.sin(state.rotation || 0);
      const points = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy]) => {
        const x = glow.centerX + dx * half - px, y = glow.centerY + dy * half - py;
        const tx = x * (state.scaleX ?? 1) + y * (state.skewX ?? state.skew ?? 0), ty = y * (state.scaleY ?? 1);
        return { x: state.x + (px + c * tx - s * ty) * scale, y: state.y + (py + s * tx + c * ty) * scale };
      });
      return { ...glow, points };
    }

    drawGlow(state) {
      const glow = this.glowFor(state);
      if (!glow) return;
      const ctx = this.ctx, scale = state.scale || 1, x = glow.centerX * scale, y = glow.centerY * scale, radius = glow.diameter * scale / 2;
      const rgb = [1,3,5].map(i => parseInt(glow.color.slice(i, i + 2), 16)).join(",");
      const gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
      for (let i = 0; i <= 32; i++) { const t = i / 32; gradient.addColorStop(t, `rgba(${rgb},${glow.intensity * Math.exp(-t * glow.falloff / 2) * (1 - smoothstep(clamp((t-.85)/.15,0,1)))})`); }
      ctx.save();ctx.globalAlpha = 1;ctx.globalCompositeOperation = "lighter";ctx.fillStyle = gradient;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
    }

    mouthPoint(state) {
      const scale = state.scale || 1;
      return {
        x: state.x + 5 * scale,
        y: state.y + 6.2 * scale
      };
    }

    headPoint(state) {
      const scale = state.scale || 1;
      return {
        x: state.x + 5 * scale,
        y: state.y + 2.4 * scale
      };
    }

    // The same affine pose is exposed to world-space lights and silhouettes.
    // Coordinates are glyph cells; the consumer owns projection and meters.
    posePoint(state, point) {
      const s = state.scale || 1, px = state.pivotX ?? 5, py = state.pivotY ?? 6;
      const x = ((point.x - px) * (state.scaleX ?? 1) + (point.y - py) * (state.skewX ?? state.skew ?? 0)) * s;
      const y = (point.y - py) * (state.scaleY ?? 1) * s;
      const r = state.rotation || 0;
      return { x: state.x + px * s + x * Math.cos(r) - y * Math.sin(r),
        y: state.y + py * s + x * Math.sin(r) + y * Math.cos(r) };
    }

    attachmentPoint(state, slot, offset = { x: 0, y: 0 }) {
      const p = this.glyphFor(state)?.attachments?.[slot];
      if (!p) throw new Error(`Unknown Soh attachment anchor: ${slot}`);
      return this.posePoint(state, { x: p.x + (offset.x || 0), y: p.y + (offset.y || 0) });
    }

    lanternCells(attachment = {}) {
      const metal = attachment.color || '#352f29', glow = attachment.glassColor || '#ffe0a0';
      return [
        { x: .25, y: 0, w: .9, h: .18, color: metal },
        { x: .25, y: 0, w: .18, h: .65, color: metal },
        { x: .97, y: 0, w: .18, h: .65, color: metal },
        { x: -.1, y: .58, w: 1.65, h: .25, color: metal },
        { x: 0, y: .83, w: 1.45, h: 1.7, color: glow },
        { x: -.1, y: .83, w: .2, h: 1.7, color: metal },
        { x: 1.35, y: .83, w: .2, h: 1.7, color: metal },
        { x: -.1, y: 2.53, w: 1.65, h: .25, color: metal }
      ];
    }

    // Coverage includes face interiors: dark pixels are still opaque. This is
    // shared renderer geometry, never a second scene-specific character shape.
    coverageRects(state, now = 0) {
      // Upright transport currently supports body/face and the shared lantern.
      // Refuse unsupported silhouettes rather than silently omit their pixels.
      const activeReach = state.showReachGesture !== false && state.gestureLine !== false && Math.max(state.touchUntil || 0, state.pokeUntil || 0) > now;
      if (state.crown || activeReach || (state.attachments || []).some(a => a.type !== 'lantern' || a.tilt || a.dynamicTilt || a.scale && a.scale !== 1)) {
        throw new Error('Soh upright light transport supports uncrowned characters and unrotated, unit-scale lanterns');
      }
      const glyph = this.glyphFor(state), paint = this.paintFor(state, glyph);
      const eyes = state.eyePixels || baseEyes, mouth = this.mouthFor(state, now) || [];
      const pixels = [...paint.bodyPixels, ...this.faceMaskPixelsFor(state, glyph, paint, eyes, mouth),
        ...offsetFacePixels(eyes, state.eyeOffset), ...mouth];
      const rects = pixels.map(p => ({ x: p.x, y: p.y, w: p.w ?? p.width ?? 1, h: p.h ?? p.height ?? 1 }));
      for (const a of state.attachments || []) {
        if (a.type !== 'lantern') continue;
        const anchor = glyph.attachments[a.slot];
        if (!anchor) continue;
        for (const cell of this.lanternCells(a)) rects.push({
          x: anchor.x + (a.offset?.x || 0) + cell.x, y: anchor.y + (a.offset?.y || 0) + cell.y, w: cell.w, h: cell.h
        });
      }
      return rects;
    }

    draw(state, now = performance.now()) {
      const ctx = this.ctx;
      const glyph = this.glyphFor(state);
      if (!ctx || !glyph) {
        return;
      }

      const scale = state.scale || 1;
      const paint = this.paintFor(state, glyph);
      const mouth = this.mouthFor(state, now) || [];
      const eyePixels = state.eyePixels || baseEyes;
      const faceMaskPixels = this.faceMaskPixelsFor(state, glyph, paint, eyePixels, mouth);

      ctx.save();
      ctx.globalAlpha = state.alpha ?? 1;
      ctx.translate(state.x + (state.pivotX ?? 5) * scale, state.y + (state.pivotY ?? 6) * scale);
      ctx.rotate(state.rotation || 0);
      ctx.transform(state.scaleX ?? 1, 0, state.skewX ?? state.skew ?? 0, state.scaleY ?? 1, 0, 0);
      ctx.translate(-(state.pivotX ?? 5) * scale, -(state.pivotY ?? 6) * scale);

      if (this.renderGlow) this.drawGlow(state);
      this.drawAttachments(state, "behind", glyph);

      ctx.fillStyle = paint.bodyColor;
      ctx.shadowColor = state.shadowColor || (state.crown ? "rgba(190, 125, 255, 0.66)" : "rgba(255, 255, 85, 0.42)");
      ctx.shadowBlur = state.shadowBlur ?? (state.crown ? 12 : 8);
      paint.bodyPixels.forEach((pixel) => {
        if (typeof state.bodyLight === 'function') {
          ctx.fillStyle = state.bodyLight(this.posePoint(state, { x: pixel.x + .5, y: pixel.y + .5 }), pixel, paint.bodyColor);
        }
        ctx.fillRect(pixel.x * scale, pixel.y * scale, scale, scale);
      });
      ctx.shadowBlur = 0;

      if (faceMaskPixels.length > 0) {
        ctx.fillStyle = paint.faceMaskColor;
        faceMaskPixels.forEach((pixel) => {
          ctx.fillRect(pixel.x * scale, pixel.y * scale, scale, scale);
        });
      }

      ctx.fillStyle = paint.eyeColor;
      eyePixels.forEach((pixel) => {
        if (typeof state.bodyLight === 'function' && paint.eyeColor === paint.bodyColor) {
          const p = { x: pixel.x + (state.eyeOffset?.x || 0), y: pixel.y + (state.eyeOffset?.y || 0) };
          ctx.fillStyle = state.bodyLight(this.posePoint(state, { x: p.x + .5, y: p.y + .5 }), p, paint.eyeColor);
        }
        ctx.fillRect(
          (pixel.x + (state.eyeOffset?.x || 0)) * scale,
          (pixel.y + (state.eyeOffset?.y || 0)) * scale,
          (pixel.w ?? pixel.width ?? 1) * scale,
          (pixel.h ?? pixel.height ?? 1) * scale);
      });

      ctx.fillStyle = paint.mouthColor;
      mouth.forEach((pixel) => {
        if (typeof state.bodyLight === 'function' && paint.mouthColor === paint.bodyColor) {
          ctx.fillStyle = state.bodyLight(this.posePoint(state, { x: pixel.x + .5, y: pixel.y + .5 }), pixel, paint.mouthColor);
        }
        ctx.fillRect(pixel.x * scale, pixel.y * scale, scale, scale);
      });

      if (state.crown) {
        this.drawCrown(state);
      }

      this.drawReachGesture(state, now);
      this.drawAttachments(state, "front", glyph);
      ctx.restore();
    }

    drawAttachments(state, layer, glyph) {
      const attachments = Array.isArray(state.attachments) ? state.attachments : [];
      attachments
        .filter((attachment) => (attachment.layer || "front") === layer)
        .forEach((attachment) => this.drawAttachment(state, attachment, glyph));
    }

    drawAttachment(state, attachment, glyph) {
      // Distant world actors need props to shrink with the body. Draw the
      // existing pixel artwork at its authored scale through a continuous
      // transform, retaining the normal snapped treatment for UI characters.
      if (state.attachmentScaleMode === "continuous") {
        const ratio = (state.scale || 1) / 4;
        this.ctx.save();
        this.ctx.scale(ratio, ratio);
        this.drawAttachment({ ...state, scale: 4, attachmentScaleMode: "pixel" }, attachment, glyph);
        this.ctx.restore();
        return;
      }
      const point = glyph?.attachments?.[attachment.slot];
      if (!point) {
        return;
      }

      const ctx = this.ctx;
      const actorScale = state.scale || 1;
      const attachmentScale = Math.max(1, Math.round(actorScale / 4) * (attachment.scale || 1));
      const offset = attachment.offset || { x: 0, y: 0 };
      const x = (point.x + offset.x) * actorScale;
      const y = (point.y + offset.y) * actorScale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((attachment.tilt || 0) + (attachment.dynamicTilt || 0)) * Math.PI / 180);
      if (attachment.type === "catalogItem") {
        this.drawCatalogItem(attachment.asset, actorScale);
      } else if (attachment.type === 'lantern') {
        for (const cell of this.lanternCells(attachment)) {
          ctx.fillStyle = cell.color;
          ctx.fillRect(cell.x * actorScale, cell.y * actorScale, cell.w * actorScale, cell.h * actorScale);
        }
      } else if (attachment.type === "slashStick") {
        this.drawSlashStick(attachment, attachmentScale);
      } else if (attachment.type === "pixelPickaxe") {
        this.drawPixelPickaxe(attachment, attachmentScale);
      } else if (attachment.type === "paperSlip") {
        this.drawPaperSlip(attachment, attachmentScale);
      } else if (attachment.type === "text") {
        this.drawAttachmentText(attachment, attachmentScale);
      } else {
        this.drawAttachmentGlyph(attachment, attachmentScale);
      }
      ctx.restore();
    }

    drawCatalogItem(asset, actorScale) {
      const geometry = window.ShedletskyCharacterItemGeometry;
      if (!geometry) throw new Error("Catalog attachments require character-item-geometry.js.");
      const frame = asset.attachmentFrame || {};
      const scale = geometry.attachmentScaleForCharacterScale(actorScale) * Number(frame.scale || 1);
      const ctx = this.ctx;
      ctx.save();
      // The item forge's anchor sits slightly below the renderer's head anchor.
      ctx.translate(Number(frame.originX || 0) * TERMINAL_FONT_WIDTH * scale,
        geometry.rendererHeadOffsetCells() * actorScale + Number(frame.originY || 0) * TERMINAL_FONT_HEIGHT * scale);
      ctx.rotate(Number(frame.rotationDegrees || 0) * Math.PI / 180);
      for (const part of asset.glyphs) {
        const partScale = scale * Number(part.scale || 1);
        const width = TERMINAL_FONT_WIDTH * partScale, height = TERMINAL_FONT_HEIGHT * partScale;
        ctx.save();
        ctx.translate(Number(part.x || 0) * TERMINAL_FONT_WIDTH * scale + width / 2,
          Number(part.y || 0) * TERMINAL_FONT_HEIGHT * scale + height / 2);
        ctx.rotate(Number(part.rotationDegrees || 0) * Math.PI / 180);
        this.drawAttachmentGlyphAt(part.code, -width / 2, -height / 2, partScale, vgaColor(part.color));
        ctx.restore();
      }
      ctx.restore();
    }

    drawPixelPickaxe(attachment, scale) {
      const ctx = this.ctx;
      const unit = Math.max(1, Math.round(scale * Number(attachment.pixelScale || 0.82)));
      const pivotCellX = Number(attachment.pivotCellX ?? -6);
      const pivotCellY = Number(attachment.pivotCellY ?? 4);
      const originX = -unit * pivotCellX;
      const originY = -unit * pivotCellY;
      const colors = {
        metalDark: attachment.metalDark || "#202323",
        metalMid: attachment.metalMid || "#5f6868",
        metalLight: attachment.metalLight || "#dff0ee",
        metalSoft: attachment.metalSoft || "#aebebe",
        woodDark: attachment.woodDark || "#332a1d",
        woodMid: attachment.woodMid || "#6d542b",
        woodLight: attachment.woodLight || "#9a7a34"
      };
      const cells = [
        [-4, -5, "metalDark"], [-3, -5, "metalDark"], [-2, -5, "metalDark"], [-1, -5, "metalDark"], [0, -5, "metalDark"],
        [-5, -4, "metalDark"], [-4, -4, "metalLight"], [-3, -4, "metalSoft"], [-2, -4, "metalSoft"], [-1, -4, "metalLight"], [0, -4, "metalDark"], [1, -4, "woodDark"], [2, -4, "woodMid"],
        [-5, -3, "metalDark"], [-4, -3, "metalDark"], [-3, -3, "metalDark"], [-2, -3, "metalDark"], [-1, -3, "metalSoft"], [0, -3, "metalSoft"], [1, -3, "woodLight"], [2, -3, "woodDark"],
        [-1, -2, "woodDark"], [0, -2, "woodMid"], [1, -2, "metalLight"], [2, -2, "metalDark"],
        [-2, -1, "woodDark"], [-1, -1, "woodLight"], [0, -1, "woodDark"], [1, -1, "metalSoft"],
        [-3, 0, "woodDark"], [-2, 0, "woodLight"], [-1, 0, "woodDark"], [1, 0, "metalSoft"], [2, 0, "metalDark"],
        [-4, 1, "woodDark"], [-3, 1, "woodLight"], [-2, 1, "woodDark"], [1, 1, "metalDark"], [2, 1, "metalLight"], [3, 1, "metalDark"],
        [-5, 2, "woodDark"], [-4, 2, "woodLight"], [-3, 2, "woodDark"], [2, 2, "metalSoft"],
        [-6, 3, "woodDark"], [-5, 3, "woodLight"], [-4, 3, "woodDark"], [2, 3, "metalDark"],
        [-7, 4, "woodDark"], [-6, 4, "woodLight"], [-5, 4, "woodDark"]
      ];

      ctx.save();
      ctx.translate(originX, originY);
      cells.forEach(([x, y, colorKey]) => {
        ctx.fillStyle = colors[colorKey] || colors.metalLight;
        ctx.fillRect(x * unit, y * unit, unit, unit);
      });
      ctx.restore();
    }

    drawPaperSlip(attachment, scale) {
      const ctx = this.ctx;
      const unit = Math.max(1, Math.round(scale * Number(attachment.pixelScale || 1)));
      const widthCells = Math.max(7, Math.round(Number(attachment.widthCells || 9)));
      const heightCells = Math.max(6, Math.round(Number(attachment.heightCells || 7)));
      const width = widthCells * unit;
      const height = heightCells * unit;
      const x = -2 * unit;
      const y = -2 * unit;
      const paperColor = attachment.paperColor || "#fff7d6";
      const edgeColor = attachment.edgeColor || "#302b21";
      const lineColor = attachment.lineColor || "#426b76";
      const stampColor = attachment.stampColor || "#78d9ff";
      const pageCount = clamp(Math.round(Number(attachment.pageCount || 1)), 1, 5);
      const pageOffset = Math.max(0.5, Number(attachment.pageOffsetCells || 0.75)) * unit;

      for (let page = pageCount - 1; page > 0; page -= 1) {
        const pageX = x + page * pageOffset;
        const pageY = y - page * pageOffset;
        ctx.fillStyle = attachment.shadowColor || "rgba(0, 0, 0, 0.58)";
        ctx.fillRect(pageX + unit, pageY + unit, width, height);
        ctx.fillStyle = page % 2 === 0 ? (attachment.backPaperColor || "#e9dfbf") : paperColor;
        ctx.fillRect(pageX, pageY, width, height);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = unit;
        ctx.strokeRect(pageX + unit * 0.5, pageY + unit * 0.5, width - unit, height - unit);
      }

      ctx.fillStyle = attachment.shadowColor || "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(x + unit, y + unit, width, height);
      ctx.fillStyle = paperColor;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = unit;
      ctx.strokeRect(x + unit * 0.5, y + unit * 0.5, width - unit, height - unit);

      const foldSize = Math.min(2 * unit, width - 2 * unit, height - 2 * unit);
      ctx.fillStyle = attachment.foldColor || "#d9cfa8";
      ctx.fillRect(x + width - foldSize - unit, y + unit, foldSize, unit);
      ctx.fillRect(x + width - unit * 2, y + unit, unit, foldSize);

      ctx.fillStyle = lineColor;
      let lineIndex = 0;
      for (let row = 2.5; row <= heightCells - 1.2; row += 1.7) {
        const endInset = lineIndex % 3 === 0 ? 4 : (lineIndex % 3 === 1 ? 3 : 5);
        ctx.fillRect(x + unit * 1.5, y + unit * row, Math.max(unit, width - unit * endInset), unit);
        lineIndex += 1;
      }

      if (attachment.binding) {
        ctx.fillStyle = attachment.bindingColor || "#b35d38";
        ctx.fillRect(x + width * 0.38, y - (pageCount - 1) * pageOffset, unit * 1.2, height + (pageCount - 1) * pageOffset);
      }

      const tabCount = clamp(Math.round(Number(attachment.tabCount || 0)), 0, 5);
      for (let tab = 0; tab < tabCount; tab += 1) {
        ctx.fillStyle = tab % 2 === 0 ? (attachment.tabColor || "#78d9ff") : (attachment.tabAltColor || "#ffdd77");
        ctx.fillRect(x + width - unit * 0.2, y + unit * (2 + tab * 2), unit * 1.4, unit);
      }

      const markerCount = clamp(Math.round(Number(attachment.markerCount || 0)), 0, 5);
      for (let marker = 0; marker < markerCount; marker += 1) {
        ctx.fillStyle = marker % 2 === 0 ? (attachment.markerColor || "#ff79c6") : (attachment.markerAltColor || "#bd93f9");
        ctx.fillRect(x + unit * (1.5 + marker * 1.4), y + height - unit * 1.6, unit, unit);
      }

      ctx.fillStyle = stampColor;
      ctx.fillRect(x + width - unit * 2.4, y + height - unit * 2.3, unit, unit);
    }

    drawSlashStick(attachment, scale) {
      const count = Math.max(2, Math.floor(Number(attachment.count) || 5));
      const color = attachment.color || YELLOW;
      const code = Number.isFinite(Number(attachment.code)) ? Number(attachment.code) : 47;
      const stepX = TERMINAL_FONT_WIDTH * scale * Number(attachment.stepX ?? 0.48);
      const stepY = TERMINAL_FONT_HEIGHT * scale * Number(attachment.stepY ?? -0.34);
      const originX = -((count - 1) * stepX) / 2;
      const originY = -((count - 1) * stepY) / 2;
      for (let index = 0; index < count; index += 1) {
        this.drawAttachmentGlyphAt(code, originX + index * stepX, originY + index * stepY, scale, color);
      }
    }

    drawAttachmentGlyph(attachment, scale) {
      const code = attachment.code ?? ((attachment.character || "^").charCodeAt(0) & 0xff);
      const glyphWidth = TERMINAL_FONT_WIDTH * scale;
      const glyphHeight = TERMINAL_FONT_HEIGHT * scale;
      const anchorX = Number.isFinite(Number(attachment.anchorX)) ? Number(attachment.anchorX) : 0.5;
      const anchorY = Number.isFinite(Number(attachment.anchorY))
        ? Number(attachment.anchorY)
        : (attachment.fit === "hat" ? LEGACY_HAT_ATTACHMENT_ANCHOR_Y : 0.5);
      const x = -glyphWidth * anchorX;
      const y = -glyphHeight * anchorY;
      this.drawAttachmentGlyphAt(code, x, y, scale, attachment.color || YELLOW);
    }

    drawAttachmentText(attachment, scale) {
      const textValue = attachment.text || "";
      const width = textValue.length * TERMINAL_FONT_WIDTH * scale;
      const height = TERMINAL_FONT_HEIGHT * scale;
      const x = -width / 2;
      const y = -height / 2;
      String(textValue).split("").forEach((char, index) => {
        this.drawAttachmentGlyphAt(char.charCodeAt(0) & 0xff, x + index * TERMINAL_FONT_WIDTH * scale, y, scale, attachment.color || YELLOW);
      });
    }

    drawAttachmentGlyphAt(code, x, y, scale, color) {
      if (this.terminalText) {
        this.terminalText.drawGlyph(code, x, y, scale, color);
        return;
      }

      const pending = this.ensureTerminalText();
      if (pending) {
        return;
      }

      if (!this.missingTerminalTextWarned) {
        this.missingTerminalTextWarned = true;
        console.error("SohEngine.CharacterRenderer skipped a CP437 attachment because TerminalTextRenderer is not ready.");
      }
    }

    drawCrown(state) {
      const ctx = this.ctx;
      const scale = state.scale || 1;
      const crownScale = Math.max(1, Math.round(scale / 4) * (state.crownScale || 1));
      const glyphWidth = TERMINAL_FONT_WIDTH * crownScale;
      const glyphHeight = TERMINAL_FONT_HEIGHT * crownScale;
      const x = 5 * scale - glyphWidth / 2;
      const y = -glyphHeight * 0.76;
      const code = Number.isFinite(Number(state.crownCode)) ? Number(state.crownCode) : STX_CROWN_CODE;
      const color = state.crownColor || this.colors.crown || vgaColor(0x2b);
      ctx.save();
      ctx.shadowColor = "rgba(255, 255, 85, 0.64)";
      ctx.shadowBlur = 8;
      this.drawAttachmentGlyphAt(code, x, y, crownScale, color);
      ctx.restore();
    }

    drawReachGesture(state, now) {
      const ctx = this.ctx;
      // Spatial scene adapters supply an exact target in glyph coordinates.
      // This stays in CharacterRenderer so every caller shares the same hand.
      if (state.reachTargets || state.reachTarget) {
        const glyph = this.glyphFor(state);
        for (const target of state.reachTargets || [state.reachTarget]) {
        const hand = glyph.attachments?.[target.slot || "rightHand"];
        if (!hand || !Number.isFinite(target.x) || !Number.isFinite(target.y)) continue;
        const weight = clamp(Number(target.weight) || 0, 0, 1);
        if (!weight) continue;
        const scale = state.scale || 1;
        const x = lerp(hand.x, target.x, weight), y = lerp(hand.y, target.y, weight);
        ctx.strokeStyle = state.gestureColor || state.bodyColor || YELLOW;
        ctx.lineWidth = scale * .40;
        ctx.lineCap = "square";
        ctx.beginPath();ctx.moveTo(hand.x * scale, hand.y * scale);ctx.lineTo(x * scale, y * scale);ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;ctx.fillRect((x - .28) * scale, (y - .28) * scale, .56 * scale, .56 * scale);
        }
        return;
      }
      const until = Math.max(state.touchUntil || 0, state.pokeUntil || 0);
      if (state.showReachGesture === false || state.gestureLine === false || !until || now >= until) {
        return;
      }

      const scale = state.scale || 1;
      const progress = 1 - clamp((until - now) / (state.gestureDuration || 640), 0, 1);
      const direction = state.crown ? -1 : 1;
      const baseReach = state.crown ? 72 : 42;
      const extraReach = state.crown ? 66 : 34;
      const reach = baseReach + Math.sin(progress * Math.PI) * extraReach;
      const handX = (state.crown ? 2.3 : 7.7) * scale;
      ctx.strokeStyle = state.gestureColor || (state.crown ? vgaColor(0x2b) : state.bodyColor || YELLOW);
      ctx.lineWidth = Math.max(2, scale * 0.32);
      ctx.beginPath();
      ctx.moveTo(handX, 6.2 * scale);
      ctx.lineTo(handX + direction * reach, 5.3 * scale - Math.sin(progress * Math.PI * 2) * 5);
      ctx.stroke();
    }
  }

  function clipEffectSeed(value) {
    const text = String(value ?? "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash / 4294967296;
  }
  function drawChopClipEffects(ctx, effects, state, scale, now) {
    if (!Array.isArray(effects) || effects.length === 0) {
      return;
    }
  
    effects.filter(effect => !["chat", "laugh"].includes(effect.type)).forEach((effect, effectIndex) => {
      const count = Math.max(1, Math.floor(Number(effect.count) || 1));
      const baseX = state.x + 7.8 * scale;
      const baseY = state.y + 8.6 * scale;
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = effect.color || "#ffff55";
      if (effect.type === "stamp") {
        ctx.strokeStyle = effect.color || "#ffcc55";
        ctx.lineWidth = Math.max(1, scale * 0.24);
        ctx.strokeRect(state.x + 5.2 * scale, state.y + 7.5 * scale, scale * 2.6, scale * 1.4);
        ctx.fillRect(state.x + 5.6 * scale, state.y + 8.1 * scale, scale * 1.8, Math.max(1, scale * 0.18));
      } else if (effect.type === "dust") {
        for (let index = 0; index < count + 2; index += 1) {
          const seed = clipEffectSeed(`${effect.type}:${effectIndex}:${index}:${Math.floor(now / 110)}`);
          const x = state.x + (2 + seed * 6) * scale;
          const y = state.y + (11.8 + Math.sin(seed * Math.PI) * 0.7) * scale;
          ctx.fillRect(x, y, Math.max(1, scale * 0.35), Math.max(1, scale * 0.28));
        }
      } else if (effect.type === "search") {
        ctx.strokeStyle = effect.color || "#55ffff";
        ctx.lineWidth = Math.max(1, scale * 0.18);
        ctx.beginPath();
        ctx.arc(state.x + 7.5 * scale, state.y + 4.6 * scale, scale * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillRect(state.x + 8.65 * scale, state.y + 5.65 * scale, Math.max(1, scale * 0.2), scale * 1.1);
      } else if (effect.type === "tear") {
        const started = Math.max(0, Number(effect.at) || 0);
        const windowSize = Math.max(0.001, Number(effect.window) || 0.14);
        const progress = Math.max(0, Math.min(1, ((Number(effect.progress) || 0) - started + windowSize) / (windowSize * 2)));
        const tearCount = Math.max(1, count);
        const tearSize = Math.max(0.28, Number(effect.size) || 0.58);
        const tearFall = Math.max(1.6, Number(effect.fall) || 4.5);
        ctx.fillStyle = effect.color || "#55ffff";
        for (let index = 0; index < tearCount; index += 1) {
          const side = index % 2 === 0 ? -1 : 1;
          const stagger = index * 0.14;
          const fall = Math.max(0, Math.min(1, progress - stagger));
          const x = state.x + (side < 0 ? 3.35 : 6.35) * scale;
          const y = state.y + (3.9 + fall * tearFall) * scale;
          ctx.fillRect(x, y, Math.max(1, scale * tearSize), Math.max(1, scale * tearSize));
        }
      } else if (effect.type === "blush") {
        ctx.fillStyle = effect.color || "#ff5555";
        ctx.globalAlpha = 0.82;
        const unit = Math.max(1, Math.floor(scale * 0.34));
        [[2.35, 5.3], [2.85, 5.7], [6.85, 5.3], [7.35, 5.7]].forEach(([x, y]) => {
          ctx.fillRect(state.x + x * scale, state.y + y * scale, unit, unit);
        });
      } else if (effect.type === "pour") {
        for (let index = 0; index < 4; index += 1) {
          ctx.fillRect(baseX + index * scale * 0.35, baseY + index * scale * 0.5, Math.max(1, scale * 0.22), Math.max(2, scale * 0.9));
        }
      } else {
        for (let index = 0; index < count; index += 1) {
          const seed = clipEffectSeed(`${effect.type}:${effectIndex}:${index}:${Math.floor(now / 80)}`);
          const x = baseX + (seed - 0.5) * scale * 6;
          const y = baseY - seed * scale * 5;
          ctx.fillRect(x, y, Math.max(1, scale * 0.45), Math.max(1, scale * 0.45));
        }
      }
      ctx.restore();
    });
  }

  /** Renders sampled clip effects through one shared character/dialogue owner.
   * The caller supplies its scene clock and already-authoritative actor states.
   * No timers, animation loops, travel or simulation behavior live here. */
  class ChopAnimationPresenter {
    constructor(ctx, options = {}) {
      this.ctx = ctx;
      this.dialogue = new DialogueManager(ctx, options);
      this.lines = new Map();
      this.actors = [];
      this.seen = new Set();
    }
    beginFrame(width, height) {
      this.dialogue.setBounds(width, height);
      this.actors = [];
      this.seen.clear();
      return this;
    }
    present(result, { now = performance.now(), clipKey = "", durationMs = 1000 } = {}) {
      const { state, effects = [], progress = 0 } = result;
      const id = state.id;
      if (!id) throw new Error("Sampled character presentation requires an actor id.");
      if (![now, progress, durationMs].every(Number.isFinite) || durationMs <= 0) throw new Error("Invalid sampled character clock.");
      this.actors.push(state);
      this.seen.add(id);
      drawChopClipEffects(this.ctx, effects, state, state.scale, progress * durationMs);
      const speech = effects.find(effect => ["chat", "laugh"].includes(effect.type));
      if (!speech) { this.clearSpeaker(id); return; }
      const text = String(speech.text || (speech.type === "laugh" ? "HA" : "..."));
      const color = speech.color || state.bodyColor;
      const signature = JSON.stringify([clipKey, speech.type, speech.at, speech.window, text, color]);
      const previous = this.lines.get(id);
      if (!previous || previous.signature !== signature || progress < previous.progress) {
        this.dialogue.say(id, text, { small: true, style: "whisper", color, forceSequence: true });
      }
      const start = Number.isFinite(speech.at) ? Math.max(0, speech.at - (speech.window ?? .035)) : 0;
      const bubble = this.dialogue.bubbles.get(id);
      // Clock translation keeps entrance animation and paused scrubbing aligned
      // without using wall-clock elapsed time as authored clip authority.
      bubble.createdAt = now - Math.max(0, progress - start) * durationMs;
      this.lines.set(id, { signature, progress });
    }
    endFrame(now, protectedRects = []) {
      for (const id of this.lines.keys()) if (!this.seen.has(id)) this.clearSpeaker(id);
      this.dialogue.draw(new Map(this.actors.map(state => [state.id, state])), now, protectedRects);
    }
    clearSpeaker(id) { this.dialogue.clearSpeaker(id); this.lines.delete(id); }
    clear() { this.lines.clear(); this.actors = []; this.seen.clear(); this.dialogue.clearAll(); }
    dispose() { this.clear(); }
  }

  class DialogueManager {
    constructor(ctx, options = {}) {
      this.ctx = ctx;
      this.bubbles = new Map();
      this.bounds = { width: 1, height: 1 };
      this.fontFamily = options.fontFamily || "\"Web437 IBM EGA 8x14\", \"Lucida Console\", monospace";
      this.fontSize = options.fontSize || 11;
      this.lineHeight = options.lineHeight || 15;
      this.paddingX = options.paddingX || 8;
      this.paddingY = options.paddingY || 7;
      this.defaultColor = options.defaultColor || YELLOW;
      this.background = options.background || "rgba(5, 5, 6, 0.96)";
      this.terminalText = options.terminalText || null;
      this.terminalTextPromise = null;
      this.continueWaits = new Map();
      this.debug = Boolean(options.debug);
      this.gridSize = Number(options.gridSize) || 0;
      this.lastSequence = 0;
      if (!this.terminalText && options.loadTerminalText !== false) {
        this.ensureTerminalText();
      }
    }

    setContext(ctx) {
      this.ctx = ctx;
      this.terminalText?.setContext?.(ctx);
      if (!this.terminalText) {
        this.ensureTerminalText();
      }
      return this;
    }

    setBounds(width, height) {
      this.bounds = { width: Math.max(1, width), height: Math.max(1, height) };
      return this;
    }

    setTerminalText(renderer) {
      this.terminalText = renderer || null;
      this.terminalText?.setContext?.(this.ctx);
      return this;
    }

    ensureTerminalText() {
      if (!this.ctx || this.terminalText || this.terminalTextPromise || typeof createTerminalTextRenderer !== "function") {
        return this.terminalTextPromise;
      }

      this.terminalTextPromise = createTerminalTextRenderer(this.ctx)
        .then((renderer) => {
          this.setTerminalText(renderer);
          return renderer;
        })
        .catch((error) => {
          console.error("SohEngine.DialogueManager could not initialize CP437 renderer.", error);
          return null;
        })
        .finally(() => {
          this.terminalTextPromise = null;
        });
      return this.terminalTextPromise;
    }

    bubbleAnchorOffset(options = {}) {
      const source = options.anchorOffset || options.bubbleAnchorOffset || options.speechBubbleAnchorOffset || null;
      const sourceX = Array.isArray(source) ? source[0] : source?.x;
      const sourceY = Array.isArray(source) ? source[1] : source?.y;
      const x = Number(options.anchorOffsetX ?? options.bubbleAnchorOffsetX ?? sourceX ?? 0) || 0;
      const y = Number(options.anchorOffsetY ?? options.bubbleAnchorOffsetY ?? sourceY ?? 0) || 0;
      return { x, y };
    }

    tailAnchorOffset(options = {}, anchorOffset = { x: 0, y: 0 }) {
      const source = options.tailAnchorOffset || options.tailOffset || options.speechTailAnchorOffset || null;
      if (source || options.tailAnchorOffsetX !== undefined || options.tailAnchorOffsetY !== undefined) {
        const sourceX = Array.isArray(source) ? source[0] : source?.x;
        const sourceY = Array.isArray(source) ? source[1] : source?.y;
        return {
          x: Number(options.tailAnchorOffsetX ?? sourceX ?? 0) || 0,
          y: Number(options.tailAnchorOffsetY ?? sourceY ?? 0) || 0
        };
      }

      if (options.tailFollowsAnchorOffset === false || options.tailFollowsPlacementOffset === false) {
        return { x: 0, y: 0 };
      }

      return {
        x: Number(anchorOffset?.x) || 0,
        y: Number(anchorOffset?.y) || 0
      };
    }

    offsetAnchor(anchor, offset) {
      if (!offset || (!offset.x && !offset.y)) {
        return anchor;
      }

      return {
        ...anchor,
        x: anchor.x + offset.x,
        y: anchor.y + offset.y,
        manual: true
      };
    }

    say(speakerId, text, options = {}) {
      const id = options.id || speakerId;
      const previous = this.bubbles.get(id);
      const now = performance.now();
      const textValue = String(text || "");
      const type = options.type || "speech";
      const style = options.style || options.bubbleStyle || "terminal";
      const operatorPopVariant = options.operatorPopVariant || options.popVariant || "snap";
      const tailStyle = options.tailStyle || (type === "thought" || style === "thought" ? "thought" : (style === "music" || style === "singing" ? "music" : "wedge"));
      const anchorOffset = this.bubbleAnchorOffset(options);
      const isNewSpeech = !previous ||
        previous.speakerId !== speakerId ||
        previous.text !== textValue ||
        previous.type !== type ||
        previous.style !== style ||
        previous.operatorPopVariant !== operatorPopVariant ||
        previous.tailStyle !== tailStyle ||
        options.forceSequence;
      const bubble = {
        id,
        speakerId,
        text: textValue,
        type,
        color: options.color || this.defaultColor,
        textColor: options.textColor || options.color || this.defaultColor,
        priority: options.priority ?? 1,
        sequence: isNewSpeech ? ++this.lastSequence : previous.sequence,
        createdAt: isNewSpeech ? now : previous.createdAt,
        expiresAt: options.duration ? now + options.duration : Infinity,
        x: previous?.x,
        y: previous?.y,
        vx: previous?.vx || 0,
        vy: previous?.vy || 0,
        width: previous?.width || 0,
        height: previous?.height || 0,
        tail: previous?.tail || { x: 0, y: 0 },
        anchorSide: options.side || "auto",
        maxChars: options.maxChars || 20,
        small: Boolean(options.small),
        requestedTextScale: Number(options.textScale) || 0,
        speakerScale: previous?.speakerScale || 1,
        textScale: previous?.textScale || 0,
        anchorOffset,
        tailAnchorOffset: this.tailAnchorOffset(options, anchorOffset),
        avoidProtectedRects: options.avoidProtectedRects !== false,
        continuePrompt: Boolean(options.continuePrompt),
        continuePromptText: String(options.continuePromptText || "> ENTER"),
        continuePromptColor: options.continuePromptColor || colorWithAlpha(options.textColor || options.color || this.defaultColor, 0.72),
        style,
        operatorPopVariant,
        tailStyle
      };
      this.measure(bubble);
      this.bubbles.set(id, bubble);
      return bubble;
    }

    clear(id) {
      this.cancelContinueWait(id);
      this.bubbles.delete(id);
    }

    clearAll() {
      [...this.continueWaits.keys()].forEach((id) => this.cancelContinueWait(id));
      this.bubbles.clear();
    }

    clearSpeaker(speakerId) {
      [...this.bubbles.values()].forEach((bubble) => {
        if (bubble.speakerId === speakerId) {
          this.cancelContinueWait(bubble.id);
          this.bubbles.delete(bubble.id);
        }
      });
    }

    waitForContinue(speakerId, text, options = {}) {
      const id = options.id || speakerId;
      this.cancelContinueWait(id);
      const bubble = this.say(speakerId, text, {
        ...options,
        duration: options.duration || 86400000,
        durationScaled: false,
        continuePrompt: true
      });
      const canvas = this.ctx?.canvas;
      if (!(canvas instanceof HTMLCanvasElement)) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) {
            return;
          }
          done = true;
          bubble.continuePrompt = false;
          bubble.continuePromptRect = null;
          canvas.removeEventListener("click", onClick);
          canvas.removeEventListener("pointerup", onClick);
          window.removeEventListener("click", onClick, true);
          window.removeEventListener("keydown", onPageKeyDown);
          if (this.continueWaits.get(bubble.id) === finish) {
            this.continueWaits.delete(bubble.id);
          }
          resolve();
        };
        const onKeyDown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }

          event.preventDefault();
          finish();
        };
        const onClick = (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const promptRect = bubble.continuePromptRect;
          const bubbleRect = { x: bubble.x || 0, y: bubble.y || 0, width: bubble.width || 0, height: bubble.height || 0 };
          if (pointInRect(x, y, promptRect) || pointInRect(x, y, bubbleRect)) {
            event.preventDefault();
            event.stopPropagation();
            finish();
          }
        };

        const onPageKeyDown = (event) => {
          // Reading a bubble must not swallow spaces/Enter in a comment form.
          if (event.target?.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
          onKeyDown(event);
        };
        canvas.addEventListener("click", onClick);
        canvas.addEventListener("pointerup", onClick);
        window.addEventListener("click", onClick, true);
        window.addEventListener("keydown", onPageKeyDown);
        this.continueWaits.set(bubble.id, finish);
      });
    }

    cancelContinueWait(id) {
      const finish = this.continueWaits.get(id);
      if (typeof finish === "function") {
        finish();
      }
    }

    activeBubbles(now = performance.now()) {
      [...this.bubbles.entries()].forEach(([id, bubble]) => {
        if (now >= bubble.expiresAt) {
          this.bubbles.delete(id);
        }
      });
      return [...this.bubbles.values()];
    }

    wrapText(text, maxChars) {
      const limit = Math.max(1, Number(maxChars) || 1);
      const lines = [];
      String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .forEach((sourceLine) => {
          const words = sourceLine.trim().split(/\s+/).filter(Boolean).flatMap((word) => {
            const characters = Array.from(word);
            return Array.from({ length: Math.ceil(characters.length / limit) }, (_, index) =>
              characters.slice(index * limit, (index + 1) * limit).join(""));
          });
          if (words.length === 0) {
            lines.push("");
            return;
          }

          let current = "";
          words.forEach((word) => {
            if (!current) {
              current = word;
              return;
            }
            if (`${current} ${word}`.length > limit) {
              lines.push(current);
              current = word;
              return;
            }
            current = `${current} ${word}`;
          });
          if (current) {
            lines.push(current);
          }
        });

      while (lines.length > 1 && lines[0] === "") {
        lines.shift();
      }
      while (lines.length > 1 && lines[lines.length - 1] === "") {
        lines.pop();
      }

      return lines.length > 0 ? lines : [""];
    }

    measure(bubble) {
      const ctx = this.ctx;
      bubble.lines = this.wrapText(bubble.text, bubble.maxChars);
      const style = this.visualStyle(bubble);
      const textScale = this.bubbleTextScale(bubble, style);
      bubble.textScale = textScale;
      bubble.measuredStyle = style;
      bubble.measuredBoundsWidth = this.bounds.width;
      if (this.isHeavyBubbleStyle(style)) {
        const paddingCells = this.bubblePaddingCells(style);
        if (this.bounds.width > 8) {
          const availableColumns = Math.floor((this.bounds.width - 8) / (TERMINAL_FONT_WIDTH * textScale));
          const maxChars = Math.max(1, Math.min(bubble.maxChars, availableColumns - paddingCells * 2));
          bubble.lines = this.wrapText(bubble.text, maxChars);
        }
        const maxLine = bubble.lines.reduce((max, line) => Math.max(max, line.length), 0);
        bubble.terminalColumns = Math.max(3, maxLine + paddingCells * 2);
        bubble.terminalRows = Math.max(3, bubble.lines.length + paddingCells * 2);
        bubble.terminalPaddingCells = paddingCells;
        bubble.width = bubble.terminalColumns * TERMINAL_FONT_WIDTH * textScale;
        bubble.height = bubble.terminalRows * TERMINAL_FONT_HEIGHT * textScale;
        return;
      }
      if (this.usesTerminalBubbleText(style)) {
        const metrics = this.terminalBubbleTextMetrics(textScale);
        const maxLine = bubble.lines.reduce((max, line) => Math.max(max, line.length), 0);
        const textWidth = maxLine > 0 ? maxLine * metrics.advance - metrics.gap : 0;
        const textHeight = bubble.lines.length > 0 ? bubble.lines.length * metrics.lineAdvance - metrics.lineGap : 0;
        const padding = this.bubblePadding(bubble, style);
        bubble.width = Math.max(86, Math.ceil(textWidth + padding.x * 2));
        bubble.height = Math.ceil(textHeight + padding.y * 2);
        return;
      }
      if (!ctx) {
        bubble.width = 96;
        bubble.height = bubble.lines.length * this.lineHeight + this.paddingY * 2;
        return;
      }

      ctx.save();
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      const textWidth = bubble.lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
      ctx.restore();
      bubble.width = Math.max(86, Math.ceil(textWidth + this.paddingX * 2));
      bubble.height = Math.ceil(bubble.lines.length * this.lineHeight + this.paddingY * 2);
    }

    layout(actorStates, now = performance.now(), protectedRects = []) {
      const bubbles = this.activeBubbles(now);
      bubbles.forEach((bubble) => {
        const speaker = actorStates.get(bubble.speakerId);
        if (!speaker) {
          return;
        }

        const scale = speaker.scale || 1;
        const headX = speaker.x + 5 * scale;
        const headY = speaker.y + 2.4 * scale;
        const speakerAnchor = this.speakerAnchor(speaker, headX, headY);
        const bubbleAnchor = this.offsetAnchor(speakerAnchor, bubble.anchorOffset);
        const tailAnchor = this.offsetAnchor(speakerAnchor, bubble.tailAnchorOffset);
        bubble.proxy = speakerAnchor.proxy;
        bubble.speakerRect = this.actorRect(speaker);
        const previousSpeakerScale = bubble.speakerScale;
        bubble.speakerScale = scale;
        if (this.visualStyle(bubble) !== bubble.measuredStyle || previousSpeakerScale !== bubble.speakerScale || bubble.measuredBoundsWidth !== this.bounds.width) {
          this.measure(bubble);
        }
        const side = bubble.anchorSide === "auto" ? (bubbleAnchor.x > this.bounds.width * 0.55 ? "left" : "right") : bubble.anchorSide;
        const recencyLift = bubble.sequence === this.lastSequence ? 16 : 0;
        const gap = this.bubbleSpeakerGap(bubble, speaker);
        const targetX = side === "left"
          ? bubbleAnchor.x - bubble.width - gap.x
          : side === "top" || side === "bottom"
            ? bubbleAnchor.x - bubble.width / 2
            : bubbleAnchor.x + gap.x;
        const targetY = side === "bottom"
          ? bubbleAnchor.y + gap.y + recencyLift
          : bubbleAnchor.y - bubble.height - gap.y - recencyLift;
        bubble.targetX = clamp(targetX, 4, this.bounds.width - bubble.width - 4);
        const continuePromptSpace = bubble.continuePrompt ? this.continuePromptSpace(bubble) : 0;
        bubble.targetY = clamp(targetY, 4, Math.max(4, this.bounds.height - bubble.height - continuePromptSpace - 4));
        bubble.x ??= bubble.targetX;
        bubble.y ??= bubble.targetY;
        bubble.tail = {
          x: tailAnchor.x,
          y: tailAnchor.manual || speakerAnchor.proxy ? tailAnchor.y : speaker.y + 6.2 * scale,
          manual: Boolean(tailAnchor.manual)
        };
      });

      const actorRects = [
        ...protectedRects.map((rect) => ({ ...rect, protected: true })),
        ...[...actorStates.values()].map((state) => this.actorRect(state))
      ].filter(Boolean);
      bubbles.forEach((bubble) => {
        if (bubble.proxy) {
          actorRects.push({
            x: bubble.proxy.x - bubble.proxy.size / 2 - 4,
            y: bubble.proxy.y - bubble.proxy.size / 2 - 4,
            width: bubble.proxy.size + 8,
            height: bubble.proxy.size + 8,
            priority: 1
          });
        }
      });

      bubbles.forEach((bubble) => this.applyBubbleSpring(bubble));
      for (let iteration = 0; iteration < 7; iteration += 1) {
        for (let a = 0; a < bubbles.length; a += 1) {
          for (let b = a + 1; b < bubbles.length; b += 1) {
            this.separateBubbles(bubbles[a], bubbles[b]);
          }
        }
        bubbles.forEach((bubble) => {
          actorRects.forEach((rect) => {
            if (rect.protected && !bubble.avoidProtectedRects) {
              return;
            }
            this.separateBubbleFromRect(bubble, rect);
          });
        });
        bubbles.forEach((bubble) => this.constrainBubble(bubble));
      }

      bubbles.forEach((bubble) => {
        bubble.vx *= 0.72;
        bubble.vy *= 0.72;
        if (Math.abs(bubble.vx) < 0.01) {
          bubble.vx = 0;
        }
        if (Math.abs(bubble.vy) < 0.01) {
          bubble.vy = 0;
        }
        if (this.gridSize > 0) {
          bubble.x = Math.round(bubble.x / this.gridSize) * this.gridSize;
          bubble.y = Math.round(bubble.y / this.gridSize) * this.gridSize;
          this.constrainBubble(bubble);
        }
      });
    }

    speakerAnchor(speaker, headX, headY) {
      const margin = 18;
      const scale = speaker.scale || 1;
      const actorRect = this.actorRect(speaker);
      const visible = actorRect.x + actorRect.width >= 0 &&
        actorRect.x <= this.bounds.width &&
        actorRect.y + actorRect.height >= 0 &&
        actorRect.y <= this.bounds.height;
      const headVisible = headX >= margin &&
        headX <= this.bounds.width - margin &&
        headY >= margin &&
        headY <= this.bounds.height - margin;
      if (visible && headVisible) {
        return { x: headX, y: headY, proxy: null };
      }

      const proxySize = clamp(scale * 4.2, 24, 42);
      return {
        x: clamp(headX, margin, this.bounds.width - margin),
        y: clamp(headY, margin, this.bounds.height - margin),
        proxy: {
          x: clamp(headX, margin, this.bounds.width - margin),
          y: clamp(headY, margin, this.bounds.height - margin),
          size: proxySize,
          color: speaker.bodyColor || this.defaultColor,
          glyph: speaker.glyph,
          mouth: speaker.mouth,
          eyeOffset: speaker.eyeOffset,
          crown: speaker.crown
        }
      };
    }

    actorRect(state) {
      const scale = state.scale || 1;
      return {
        x: state.x - 3,
        y: state.y - 3,
        width: SOURCE_WIDTH * scale + 6,
        height: SOURCE_HEIGHT * scale + 6,
        priority: 1
      };
    }

    bubbleSpeakerGap(bubble, speaker) {
      const rect = bubble.speakerRect || this.actorRect(speaker);
      return {
        x: clamp(16 + rect.width * 0.24, 22, 118),
        y: clamp(14 + rect.height * 0.24, 20, 112)
      };
    }

    applyBubbleSpring(bubble) {
      const recency = bubble.sequence === this.lastSequence ? 1.45 : 1;
      const priority = clamp(Math.max(0.45, bubble.priority), 0.45, 2.6);
      const stiffness = Math.min(0.2, 0.045 * recency * priority);
      const maxSpeed = 12 + priority * 3;
      bubble.vx = clamp((bubble.vx + (bubble.targetX - bubble.x) * stiffness) * 0.72, -maxSpeed, maxSpeed);
      bubble.vy = clamp((bubble.vy + (bubble.targetY - bubble.y) * stiffness) * 0.72, -maxSpeed, maxSpeed);
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;
    }

    separateBubbles(a, b) {
      const margin = 6;
      const overlapX = Math.min(a.x + a.width + margin, b.x + b.width + margin) - Math.max(a.x - margin, b.x - margin);
      const overlapY = Math.min(a.y + a.height + margin, b.y + b.height + margin) - Math.max(a.y - margin, b.y - margin);
      if (overlapX <= 0 || overlapY <= 0) {
        return;
      }

      const moveX = overlapX < overlapY;
      const totalPriority = Math.max(0.001, a.priority + b.priority + (a.sequence === this.lastSequence ? 0.8 : 0) + (b.sequence === this.lastSequence ? 0.8 : 0));
      const aShare = (b.priority + (b.sequence === this.lastSequence ? 0.8 : 0)) / totalPriority;
      const bShare = (a.priority + (a.sequence === this.lastSequence ? 0.8 : 0)) / totalPriority;
      const direction = moveX
        ? (a.x + a.width / 2 < b.x + b.width / 2 ? -1 : 1)
        : (a.y + a.height / 2 < b.y + b.height / 2 ? -1 : 1);
      const amount = (moveX ? overlapX : overlapY) * 0.32;

      if (moveX) {
        a.x += direction * amount * aShare;
        b.x -= direction * amount * bShare;
      } else {
        a.y += direction * amount * aShare;
        b.y -= direction * amount * bShare;
      }
    }

    separateBubbleFromRect(bubble, rect) {
      const margin = 8;
      const overlapX = Math.min(bubble.x + bubble.width + margin, rect.x + rect.width + margin) - Math.max(bubble.x - margin, rect.x - margin);
      const overlapY = Math.min(bubble.y + bubble.height + margin, rect.y + rect.height + margin) - Math.max(bubble.y - margin, rect.y - margin);
      if (overlapX <= 0 || overlapY <= 0) {
        return;
      }

      const bubbleCenterX = bubble.x + bubble.width / 2;
      const bubbleCenterY = bubble.y + bubble.height / 2;
      const rectCenterX = rect.x + rect.width / 2;
      const rectCenterY = rect.y + rect.height / 2;
      const preferHorizontal = rect.protected &&
        bubble.tail?.manual &&
        (bubble.anchorSide === "left" || bubble.anchorSide === "right");
      if (overlapX < overlapY || preferHorizontal) {
        bubble.x += (bubbleCenterX < rectCenterX ? -1 : 1) * overlapX * 0.42;
      } else {
        bubble.y += (bubbleCenterY < rectCenterY ? -1 : 1) * overlapY * 0.42;
      }
    }

    constrainBubble(bubble) {
      const x = clamp(bubble.x, 4, this.bounds.width - bubble.width - 4);
      const continuePromptSpace = bubble.continuePrompt ? this.continuePromptSpace(bubble) : 0;
      const y = clamp(bubble.y, 4, Math.max(4, this.bounds.height - bubble.height - continuePromptSpace - 4));
      if (x !== bubble.x) {
        bubble.vx = 0;
      }
      if (y !== bubble.y) {
        bubble.vy = 0;
      }
      bubble.x = x;
      bubble.y = y;
    }

    draw(actorStates, now = performance.now(), protectedRects = []) {
      const ctx = this.ctx;
      if (!ctx) {
        return;
      }

      this.layout(actorStates, now, protectedRects);
      const bubbles = this.activeBubbles(now)
        .sort((a, b) => a.priority - b.priority || a.sequence - b.sequence);
      bubbles.forEach((bubble) => this.drawBubble(bubble, now));
    }

    drawBubble(bubble, now = performance.now()) {
      const ctx = this.ctx;
      const x = Math.round(bubble.x);
      const y = Math.round(bubble.y);
      const tail = this.bubbleTailGeometry(bubble, x, y);
      const style = this.visualStyle(bubble);
      const pop = this.operatorCommentPopState(bubble, now, style);

      ctx.save();
      if (bubble.proxy) {
        this.drawSpeakerProxy(bubble.proxy);
      }
      if (pop.active) {
        this.applyOperatorCommentPopTransform(bubble, x, y, pop);
      }
      ctx.shadowColor = colorWithAlpha(bubble.color, this.isHeavyBubbleStyle(style) ? 0.14 : 0.1);
      ctx.shadowBlur = (this.isHeavyBubbleStyle(style) ? 5 : 3) + pop.shadowBoost;
      ctx.fillStyle = this.background;
      ctx.globalAlpha *= pop.alpha;
      ctx.fillRect(x, y, bubble.width, bubble.height);
      ctx.shadowBlur = 0;

      if (bubble.type === "speech" || bubble.type === "thought") {
        this.drawBubbleTail(bubble, tail);
      }
      this.drawBubbleFrame(bubble, x, y);
      if (pop.impact > 0) {
        this.drawOperatorCommentImpact(bubble, x, y, pop);
      }

      this.drawBubbleText(bubble, x, y, style);
      this.drawContinuePrompt(bubble, x, y, style);
      if (this.debug) {
        ctx.strokeStyle = "rgba(85, 255, 255, 0.78)";
        ctx.strokeRect(Math.round(bubble.targetX) + 0.5, Math.round(bubble.targetY) + 0.5, bubble.width - 1, bubble.height - 1);
        ctx.fillStyle = "rgba(85, 255, 255, 0.88)";
        ctx.fillRect(Math.round(tail.tip.x) - 1, Math.round(tail.tip.y) - 1, 3, 3);
      }
      ctx.restore();
    }

    operatorCommentPopState(bubble, now, style = this.visualStyle(bubble)) {
      if (style !== "operator-comment") {
        return { active: false, alpha: 1, scale: 1, impact: 0, shadowBoost: 0 };
      }

      const variant = bubble.operatorPopVariant || "snap";
      const config = this.operatorCommentPopConfig(variant);
      const duration = animationDuration(config.duration);
      const age = Math.max(0, now - (bubble.createdAt || now));
      const progress = clamp(duration > 0 ? age / duration : 1, 0, 1);
      if (progress >= 1) {
        return { active: false, alpha: 1, scale: 1, impact: 0, shadowBoost: 0 };
      }

      const impactAt = config.impactAt;
      if (progress < impactAt) {
        const approach = easeOutCubic(progress / impactAt);
        const scale = lerp(config.fromScale, config.overshootScale, approach);
        return {
          active: true,
          alpha: lerp(config.fromAlpha, 1, approach),
          scale,
          scaleX: scale,
          scaleY: scale,
          impact: 0,
          shadowBoost: lerp(config.startShadow, config.impactShadow, approach),
          impactAlpha: config.impactAlpha,
          impactSpread: config.impactSpread
        };
      }

      const settle = (progress - impactAt) / (1 - impactAt);
      const damp = 1 - easeOutCubic(settle);
      const wobble = Math.cos(settle * Math.PI * config.wobbleCycles) * damp;
      const impact = Math.sin(Math.min(1, settle * config.impactPulse) * Math.PI) * damp * config.impactStrength;
      const squash = Math.sin(Math.min(1, settle * 1.4) * Math.PI) * damp * config.squash;
      const scale = 1 + config.rebound * wobble;
      return {
        active: true,
        alpha: 1,
        scale,
        scaleX: scale + squash,
        scaleY: scale - squash * 0.62,
        impact: Math.max(0, impact),
        shadowBoost: config.settleShadow * damp,
        impactAlpha: config.impactAlpha,
        impactSpread: config.impactSpread
      };
    }

    operatorCommentPopConfig(variant) {
      switch (variant) {
        case "snap":
          return {
            duration: 300,
            impactAt: 0.52,
            fromScale: 0.66,
            overshootScale: 1.13,
            fromAlpha: 0.28,
            rebound: 0.045,
            squash: 0.018,
            wobbleCycles: 1.8,
            impactPulse: 2.1,
            impactStrength: 1.25,
            impactAlpha: 0.56,
            impactSpread: 16,
            startShadow: 16,
            impactShadow: 5,
            settleShadow: 2.4
          };
        case "soft":
          return {
            duration: 560,
            impactAt: 0.72,
            fromScale: 0.84,
            overshootScale: 1.035,
            fromAlpha: 0.42,
            rebound: 0.025,
            squash: 0,
            wobbleCycles: 1.35,
            impactPulse: 1.15,
            impactStrength: 0.45,
            impactAlpha: 0.26,
            impactSpread: 8,
            startShadow: 8,
            impactShadow: 3,
            settleShadow: 1.2
          };
        case "rubber":
          return {
            duration: 640,
            impactAt: 0.58,
            fromScale: 0.72,
            overshootScale: 1.16,
            fromAlpha: 0.2,
            rebound: 0.088,
            squash: 0.052,
            wobbleCycles: 3.1,
            impactPulse: 2.45,
            impactStrength: 0.95,
            impactAlpha: 0.42,
            impactSpread: 13,
            startShadow: 14,
            impactShadow: 4,
            settleShadow: 2.1
          };
        default:
          return this.operatorCommentPopConfig("snap");
        case "glass":
          return {
            duration: 420,
            impactAt: 0.64,
            fromScale: 0.78,
            overshootScale: 1.075,
            fromAlpha: 0.18,
            rebound: 0.075,
            squash: 0.012,
            wobbleCycles: 2.35,
            impactPulse: 1.6,
            impactStrength: 1,
            impactAlpha: 0.42,
            impactSpread: 12,
            startShadow: 12,
            impactShadow: 4,
            settleShadow: 2
          };
      }
    }

    applyOperatorCommentPopTransform(bubble, x, y, pop) {
      const ctx = this.ctx;
      const centerX = x + bubble.width / 2;
      const centerY = y + bubble.height / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(pop.scaleX || pop.scale, pop.scaleY || pop.scale);
      ctx.translate(-centerX, -centerY);
    }

    drawOperatorCommentImpact(bubble, x, y, pop) {
      const ctx = this.ctx;
      const spread = 4 + pop.impact * (pop.impactSpread || 12);
      ctx.save();
      ctx.globalAlpha *= (pop.impactAlpha || 0.42) * pop.impact;
      ctx.strokeStyle = bubble.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(x - spread) + 0.5,
        Math.round(y - spread) + 0.5,
        Math.round(bubble.width + spread * 2),
        Math.round(bubble.height + spread * 2));
      ctx.restore();
    }

    drawContinuePrompt(bubble, x, y, style = this.visualStyle(bubble)) {
      if (!bubble.continuePrompt) {
        bubble.continuePromptRect = null;
        return;
      }

      const prompt = this.continuePromptLayout(bubble, x, y, style);
      if (!prompt) {
        return;
      }

      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = this.background;
      ctx.strokeStyle = prompt.color;
      ctx.lineWidth = 1;
      ctx.fillRect(prompt.x, prompt.y, prompt.width, prompt.height);
      ctx.strokeRect(prompt.x + 0.5, prompt.y + 0.5, prompt.width - 1, prompt.height - 1);
      if (prompt.terminal) {
        this.terminalText.drawText([prompt.text], prompt.textX, prompt.textY, prompt.scale, prompt.color, {
          uppercase: true,
          advance: this.isHeavyBubbleStyle(style) ? TERMINAL_FONT_WIDTH : TERMINAL_FONT_WIDTH + 1,
          lineAdvance: this.isHeavyBubbleStyle(style) ? TERMINAL_FONT_HEIGHT : TERMINAL_FONT_HEIGHT + 2
        });
      } else {
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = "top";
        ctx.fillStyle = prompt.color;
        ctx.fillText(prompt.text, prompt.textX, prompt.textY);
      }
      ctx.restore();
      bubble.continuePromptRect = {
        x: prompt.x,
        y: prompt.y,
        width: prompt.width,
        height: prompt.height
      };
    }

    continuePromptSpace(bubble, style = this.visualStyle(bubble)) {
      const metrics = this.continuePromptMetrics(bubble, style);
      return metrics ? metrics.height + metrics.gap : 0;
    }

    continuePromptMetrics(bubble, style = this.visualStyle(bubble)) {
      if (!bubble.continuePrompt) {
        return null;
      }

      const text = bubble.continuePromptText || "> ENTER";
      if (this.usesTerminalBubbleText(style)) {
        if (!this.terminalText) {
          this.ensureTerminalText();
          return null;
        }
        const scale = bubble.textScale || this.bubbleTextScale(bubble, style);
        const terminalMetrics = this.terminalBubbleTextMetrics(scale);
        const horizontalPadding = Math.max(6, Math.round(5 * scale));
        const verticalPadding = Math.max(3, Math.round(3 * scale));
        const textWidth = text.length * terminalMetrics.advance - terminalMetrics.gap;
        return {
          text,
          terminal: true,
          scale,
          color: bubble.continuePromptColor || colorWithAlpha(bubble.textColor, 0.9),
          textWidth,
          textHeight: terminalMetrics.glyphHeight,
          horizontalPadding,
          verticalPadding,
          width: Math.ceil(textWidth + horizontalPadding * 2),
          height: Math.ceil(terminalMetrics.glyphHeight + verticalPadding * 2),
          gap: Math.max(5, Math.round(4 * scale))
        };
      }

      const ctx = this.ctx;
      ctx.save();
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      const textWidth = ctx.measureText(text).width;
      ctx.restore();
      const horizontalPadding = 6;
      const verticalPadding = 3;
      return {
        text,
        terminal: false,
        scale: 1,
        color: bubble.continuePromptColor || colorWithAlpha(bubble.textColor, 0.9),
        textWidth,
        textHeight: this.lineHeight,
        horizontalPadding,
        verticalPadding,
        width: Math.ceil(textWidth + horizontalPadding * 2),
        height: Math.ceil(this.lineHeight + verticalPadding * 2),
        gap: 5
      };
    }

    continuePromptLayout(bubble, x, y, style = this.visualStyle(bubble)) {
      const metrics = this.continuePromptMetrics(bubble, style);
      if (!metrics) {
        return null;
      }

      const speakerIsRight = (bubble.tail?.x ?? x + bubble.width) >= x + bubble.width / 2;
      const desiredX = speakerIsRight ? x : x + bubble.width - metrics.width;
      const promptX = clamp(desiredX, 4, Math.max(4, this.bounds.width - metrics.width - 4));
      const promptY = clamp(
        y + bubble.height + metrics.gap,
        4,
        Math.max(4, this.bounds.height - metrics.height - 4));
      return {
        ...metrics,
        x: promptX,
        y: promptY,
        textX: promptX + metrics.horizontalPadding,
        textY: promptY + metrics.verticalPadding
      };
    }

    bubbleTailGeometry(bubble, x, y) {
      const bubbleRect = { x, y, width: bubble.width, height: bubble.height };
      const tip = this.bubbleTailTip(bubble, bubbleRect);
      const attach = this.edgePointToward(bubbleRect, tip);
      const edge = this.edgeForPoint(bubbleRect, attach);
      const baseWidth = clamp(Math.min(bubble.width, bubble.height) * 0.18, 6, 13);
      const inset = 1.5;
      let tangent = { x: 1, y: 0 };
      let normal = { x: 0, y: 1 };

      if (edge === "left" || edge === "right") {
        tangent = { x: 0, y: 1 };
        normal = { x: edge === "left" ? -1 : 1, y: 0 };
      } else {
        tangent = { x: 1, y: 0 };
        normal = { x: 0, y: edge === "top" ? -1 : 1 };
      }

      const baseA = this.clampPointToBubbleEdge({
        x: attach.x - tangent.x * baseWidth + normal.x * inset,
        y: attach.y - tangent.y * baseWidth + normal.y * inset
      }, bubbleRect, edge);
      const baseB = this.clampPointToBubbleEdge({
        x: attach.x + tangent.x * baseWidth + normal.x * inset,
        y: attach.y + tangent.y * baseWidth + normal.y * inset
      }, bubbleRect, edge);

      return {
        baseA,
        baseB,
        tip,
        speakerRect: bubble.proxy
          ? {
              x: bubble.proxy.x - bubble.proxy.size / 2,
              y: bubble.proxy.y - bubble.proxy.size / 2,
              width: bubble.proxy.size,
              height: bubble.proxy.size
            }
          : bubble.speakerRect,
        edge,
        direction: tip.x < x + bubble.width / 2 ? -1 : 1
      };
    }

    bubbleTailTip(bubble, bubbleRect) {
      const sourceRect = bubble.proxy
        ? {
            x: bubble.proxy.x - bubble.proxy.size / 2,
            y: bubble.proxy.y - bubble.proxy.size / 2,
            width: bubble.proxy.size,
            height: bubble.proxy.size
          }
        : bubble.speakerRect;
      if (!sourceRect) {
        return {
          x: bubble.tail.x,
          y: bubble.tail.y
        };
      }
      if (bubble.tail?.manual) {
        return {
          x: bubble.tail.x,
          y: bubble.tail.y
        };
      }

      const bubbleCenter = {
        x: bubbleRect.x + bubbleRect.width / 2,
        y: bubbleRect.y + bubbleRect.height / 2
      };
      const sourceCenter = {
        x: sourceRect.x + sourceRect.width / 2,
        y: sourceRect.y + sourceRect.height / 2
      };
      let dx = bubbleCenter.x - sourceCenter.x;
      let dy = bubbleCenter.y - sourceCenter.y;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        dy = -1;
      }

      const halfWidth = Math.max(1, sourceRect.width / 2);
      const halfHeight = Math.max(1, sourceRect.height / 2);
      const divisor = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight, 0.001);
      const length = Math.max(1, Math.hypot(dx, dy));
      const gap = bubble.proxy ? 5 : 7;
      return {
        x: sourceCenter.x + dx / divisor + dx / length * gap,
        y: sourceCenter.y + dy / divisor + dy / length * gap
      };
    }

    edgePointToward(rect, point) {
      const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      };
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const halfWidth = Math.max(1, rect.width / 2);
      const halfHeight = Math.max(1, rect.height / 2);
      const divisor = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight, 0.001);
      return {
        x: center.x + dx / divisor,
        y: center.y + dy / divisor
      };
    }

    edgeForPoint(rect, point) {
      const distances = [
        ["left", Math.abs(point.x - rect.x)],
        ["right", Math.abs(point.x - (rect.x + rect.width))],
        ["top", Math.abs(point.y - rect.y)],
        ["bottom", Math.abs(point.y - (rect.y + rect.height))]
      ];
      distances.sort((a, b) => a[1] - b[1]);
      return distances[0][0];
    }

    clampPointToBubbleEdge(point, rect, edge) {
      if (edge === "left" || edge === "right") {
        return {
          x: edge === "left" ? rect.x : rect.x + rect.width,
          y: clamp(point.y, rect.y + 6, rect.y + rect.height - 6)
        };
      }

      return {
        x: clamp(point.x, rect.x + 6, rect.x + rect.width - 6),
        y: edge === "top" ? rect.y : rect.y + rect.height
      };
    }

    drawBubbleFrame(bubble, x, y) {
      const ctx = this.ctx;
      const width = bubble.width;
      const height = bubble.height;
      const style = this.visualStyle(bubble);

      ctx.strokeStyle = bubble.color;
      ctx.lineWidth = 1;
      if (style === "dash" || style === "whisper" || style === "offscreen") {
        ctx.setLineDash([6, 4]);
        if (style === "offscreen") {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        ctx.setLineDash([]);
        return;
      }
      if (this.isOperatorAddressStyle(style)) {
        this.drawOperatorBubbleFrame(bubble, x, y, width, height, style);
        return;
      }
      if (style === "shout" || style === "burst") {
        ctx.lineWidth = 2;
        this.drawHeavyDosFrame(bubble, x, y, width, height);
        this.drawJaggedBubbleFrame(x, y, width, height);
        ctx.lineWidth = 1;
        return;
      }
      if (style === "dotted" || style === "thought-cloud" || style === "thought") {
        this.drawHeavyDosFrame(bubble, x, y, width, height);
        this.drawDottedBubbleFrame(x + 3, y + 3, width - 6, height - 6);
        return;
      }
      if (style === "broadcast") {
        this.drawHeavyDosFrame(bubble, x, y, width, height);
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(x + 8, y - 4.5);
        ctx.lineTo(x + width - 8, y - 4.5);
        ctx.moveTo(x + 8, y + height + 4.5);
        ctx.lineTo(x + width - 8, y + height + 4.5);
        ctx.stroke();
        ctx.lineWidth = 1;
        return;
      }

      this.drawHeavyDosFrame(bubble, x, y, width, height);
      if (style === "royal") {
        this.drawBubbleCornerMarks(x, y, width, height);
      }
    }

    drawBubbleTail(bubble, tail) {
      const ctx = this.ctx;
      const style = this.visualStyle(bubble);
      const tailStyle = bubble.tailStyle || (bubble.type === "thought" ? "thought" : "wedge");
      ctx.strokeStyle = bubble.color;
      ctx.lineWidth = this.isHeavyBubbleStyle(style) ? 2 : 1;
      ctx.fillStyle = this.background;

      if (tailStyle === "thought") {
        this.drawBubbleGlyphTail(tail, {
          glyphs: ["o", "\u00b0", "O"],
          color: bubble.color,
          sizes: [11, 12, 14],
          wobble: 0.8,
          range: [0.18, 0.62],
          minTipDistance: 24
        });
        return;
      }

      if (tailStyle === "music") {
        this.drawBubbleGlyphTail(tail, {
          glyphs: ["\u266a", "\u266b", "\u266a"],
          color: bubble.color,
          sizes: [14, 16, 13],
          wobble: 1.3,
          range: [0.16, 0.56],
          minTipDistance: 32,
          stagger: 0.08
        });
        return;
      }

      if (style === "dash" || style === "whisper") {
        ctx.setLineDash([4, 3]);
      }
      if (style === "offscreen") {
        ctx.lineWidth = 1;
      }
      if (style === "dotted" || style === "thought-cloud") {
        const startX = (tail.baseA.x + tail.baseB.x) / 2;
        const startY = (tail.baseA.y + tail.baseB.y) / 2;
        this.decorativeTailAmounts(tail, 3, {
          range: [0.2, 0.64],
          minTipDistance: 24
        }).forEach((amount, index) => {
          const dotX = lerp(startX, tail.tip.x, amount);
          const dotY = lerp(startY, tail.tip.y, amount);
          const size = 2 + index * 2;
          ctx.strokeRect(Math.round(dotX - size / 2) + 0.5, Math.round(dotY - size / 2) + 0.5, size, size);
        });
        ctx.setLineDash([]);
        return;
      }
      if (style === "shout" || style === "burst") {
        ctx.beginPath();
        ctx.moveTo(tail.baseA.x, tail.baseA.y);
        ctx.lineTo(lerp(tail.baseA.x, tail.tip.x, 0.42) - tail.direction * 6, lerp(tail.baseA.y, tail.tip.y, 0.42));
        ctx.lineTo(tail.tip.x, tail.tip.y);
        ctx.lineTo(lerp(tail.baseB.x, tail.tip.x, 0.38) + tail.direction * 7, lerp(tail.baseB.y, tail.tip.y, 0.38));
        ctx.lineTo(tail.baseB.x, tail.baseB.y);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }
      if (this.isOperatorAddressStyle(style)) {
        this.drawOperatorAddressTail(tail, bubble, style);
        return;
      }

      ctx.beginPath();
      ctx.moveTo(tail.baseA.x, tail.baseA.y);
      ctx.lineTo(tail.tip.x, tail.tip.y);
      ctx.lineTo(tail.baseB.x, tail.baseB.y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tail.baseA.x, tail.baseA.y);
      ctx.lineTo(tail.tip.x, tail.tip.y);
      ctx.lineTo(tail.baseB.x, tail.baseB.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    visualStyle(bubble) {
      const style = bubble.style || "terminal";
      if (bubble.proxy && style !== "royal" && style !== "system" && !this.isOperatorAddressStyle(style)) {
        return "offscreen";
      }
      if (style === "speech" || style === "normal") {
        return "terminal";
      }
      if (style === "singing") {
        return "music";
      }
      return style;
    }

    usesTerminalBubbleText(style) {
      return this.isHeavyBubbleStyle(style) || style === "offscreen";
    }

    bubbleTextScale(bubble, style = this.visualStyle(bubble)) {
      if (bubble.requestedTextScale > 0) {
        return bubble.requestedTextScale;
      }
      const speakerScale = Math.max(1, Number(bubble.speakerScale) || 1);
      const actorScale = clamp(Math.sqrt(speakerScale / 8), 1, bubble.small ? 1.28 : 1.75);
      if (!this.isHeavyBubbleStyle(style)) {
        return actorScale;
      }
      return bubble.small ? actorScale : Math.max(2, actorScale);
    }

    terminalBubbleTextMetrics(scale = 1) {
      if (this.terminalText) {
        return this.terminalText.metrics(scale);
      }
      return {
        glyphWidth: TERMINAL_FONT_WIDTH * scale,
        glyphHeight: TERMINAL_FONT_HEIGHT * scale,
        advance: (TERMINAL_FONT_WIDTH + 1) * scale,
        lineAdvance: (TERMINAL_FONT_HEIGHT + 2) * scale,
        gap: scale,
        lineGap: 2 * scale
      };
    }

    bubblePadding(bubble, style = this.visualStyle(bubble)) {
      const scale = bubble.textScale || this.bubbleTextScale(bubble, style);
      if (!this.isHeavyBubbleStyle(style)) {
        return { x: this.paddingX, y: this.paddingY };
      }
      return {
        x: Math.max(10, TERMINAL_FONT_WIDTH * scale * (style === "thought" ? 1.7 : 1.25)),
        y: Math.max(8, TERMINAL_FONT_HEIGHT * scale * 0.62)
      };
    }

    bubblePaddingCells(style = "terminal") {
      if (style === "operator-prompt") {
        return 5;
      }
      if (style === "operator-comment") {
        return 3;
      }
      if (this.isOperatorAddressStyle(style)) {
        return 2;
      }
      return style === "thought" || style === "thought-cloud" || style === "dotted" ? 2 : 1;
    }

    drawBubbleText(bubble, x, y, style = this.visualStyle(bubble)) {
      if (this.usesTerminalBubbleText(style)) {
        if (!this.terminalText) {
          this.ensureTerminalText();
          return;
        }
        const scale = bubble.textScale || this.bubbleTextScale(bubble, style);
        const paddingCells = bubble.terminalPaddingCells || this.bubblePaddingCells(style);
        const padding = this.isHeavyBubbleStyle(style)
          ? { x: paddingCells * TERMINAL_FONT_WIDTH * scale, y: paddingCells * TERMINAL_FONT_HEIGHT * scale }
          : this.bubblePadding(bubble, style);
        this.terminalText.drawText(bubble.lines, x + padding.x, y + padding.y, scale, bubble.textColor, {
          uppercase: style !== "whisper",
          advance: this.isHeavyBubbleStyle(style) ? TERMINAL_FONT_WIDTH : TERMINAL_FONT_WIDTH + 1,
          lineAdvance: this.isHeavyBubbleStyle(style) ? TERMINAL_FONT_HEIGHT : TERMINAL_FONT_HEIGHT + 2
        });
        return;
      }

      const ctx = this.ctx;
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textBaseline = "top";
      ctx.fillStyle = bubble.textColor;
      bubble.lines.forEach((line, index) => {
        ctx.fillText(line, x + this.paddingX, y + this.paddingY + index * this.lineHeight);
      });
    }

    isHeavyBubbleStyle(style) {
      return style !== "dash" && style !== "whisper" && style !== "offscreen";
    }

    isOperatorAddressStyle(style) {
      return style === "operator-slash" ||
        style === "operator-prompt" ||
        style === "operator-screen" ||
        style === "operator-comment";
    }

    drawHeavyDosFrame(bubble, x, y, width, height) {
      const ctx = this.ctx;
      const scale = bubble.textScale || this.bubbleTextScale(bubble);
      const cellWidth = TERMINAL_FONT_WIDTH * scale;
      const cellHeight = TERMINAL_FONT_HEIGHT * scale;
      if (this.terminalText) {
        const columns = bubble.terminalColumns || Math.max(3, Math.round(width / cellWidth));
        const rows = bubble.terminalRows || Math.max(3, Math.round(height / cellHeight));
        const snappedWidth = columns * cellWidth;
        const snappedHeight = rows * cellHeight;
        const left = Math.round(x);
        const top = Math.round(y);
        this.terminalText.drawCodeLine([0xc9, ...Array(columns - 2).fill(0xcd), 0xbb], left, top, scale, ctx.strokeStyle, {
          advance: TERMINAL_FONT_WIDTH
        });
        for (let row = 1; row < rows - 1; row += 1) {
          this.terminalText.drawGlyph(0xba, left, top + row * cellHeight, scale, ctx.strokeStyle);
          this.terminalText.drawGlyph(0xba, left + snappedWidth - cellWidth, top + row * cellHeight, scale, ctx.strokeStyle);
        }
        this.terminalText.drawCodeLine([0xc8, ...Array(columns - 2).fill(0xcd), 0xbc], left, top + snappedHeight - cellHeight, scale, ctx.strokeStyle, {
          advance: TERMINAL_FONT_WIDTH
        });
        if (Math.abs(snappedWidth - width) > 2 || Math.abs(snappedHeight - height) > 2) {
          ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
        }
        return;
      }
      this.ensureTerminalText();
    }

    decorativeTailAmounts(tail, count, options = {}) {
      const [rangeStart, rangeEnd] = options.range || [0.18, 0.62];
      const start = {
        x: (tail.baseA.x + tail.baseB.x) / 2,
        y: (tail.baseA.y + tail.baseB.y) / 2
      };
      const dx = tail.tip.x - start.x;
      const dy = tail.tip.y - start.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const minTipDistance = Math.max(0, Number(options.minTipDistance) || 0);
      const maxByDistance = clamp(1 - minTipDistance / length, 0.18, 0.88);
      const maxAmount = Math.max(rangeStart, Math.min(rangeEnd, maxByDistance));
      if (count <= 1) {
        return [(rangeStart + maxAmount) / 2];
      }

      return Array.from({ length: count }, (_, index) => {
        const step = index / (count - 1);
        const stagger = (Number(options.stagger) || 0) * Math.sin((index + 1) * 1.7);
        return clamp(lerp(rangeStart, maxAmount, step) + stagger, rangeStart, maxAmount);
      });
    }

    drawBubbleGlyphTail(tail, options = {}) {
      const glyphs = options.glyphs || ["o", "\u00b0", "O"];
      const sizes = options.sizes || [10, 12, 14];
      const wobble = options.wobble || 0;
      const start = {
        x: (tail.baseA.x + tail.baseB.x) / 2,
        y: (tail.baseA.y + tail.baseB.y) / 2
      };
      const now = performance.now() / 1000;
      const glyphCodes = new Map([
        ["o", 0x6f],
        ["O", 0x4f],
        ["\u00b0", 0xf8],
        ["\u266a", 0x0d],
        ["\u266b", 0x0e]
      ]);

      if (!this.terminalText) {
        this.ensureTerminalText();
        return;
      }

      const amounts = this.decorativeTailAmounts(tail, glyphs.length, options);
      glyphs.forEach((glyph, index) => {
        const amount = amounts[index];
        const size = sizes[index] || sizes[sizes.length - 1] || 12;
        const scale = Math.max(1, Math.round(size / TERMINAL_FONT_HEIGHT));
        const code = glyphCodes.get(glyph);
        if (code === undefined) {
          return;
        }
        const drift = Math.sin(now * (2.2 + index * 0.4) + index * 1.7) * wobble;
        const x = lerp(start.x, tail.tip.x, amount) + drift - TERMINAL_FONT_WIDTH * scale / 2;
        const y = lerp(start.y, tail.tip.y, amount) - drift * 0.6 - TERMINAL_FONT_HEIGHT * scale / 2;
        this.terminalText.drawGlyph(code, Math.round(x), Math.round(y), scale, options.color || YELLOW);
      });
    }

    drawJaggedBubbleFrame(x, y, width, height) {
      const ctx = this.ctx;
      const step = 12;
      const spike = 5;
      ctx.beginPath();
      ctx.moveTo(x, y + spike);
      for (let px = x + step; px < x + width; px += step) {
        ctx.lineTo(px - step / 2, y - spike);
        ctx.lineTo(px, y);
      }
      for (let py = y + step; py < y + height; py += step) {
        ctx.lineTo(x + width + spike, py - step / 2);
        ctx.lineTo(x + width, py);
      }
      for (let px = x + width - step; px > x; px -= step) {
        ctx.lineTo(px + step / 2, y + height + spike);
        ctx.lineTo(px, y + height);
      }
      for (let py = y + height - step; py > y; py -= step) {
        ctx.lineTo(x - spike, py + step / 2);
        ctx.lineTo(x, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    drawDottedBubbleFrame(x, y, width, height) {
      const ctx = this.ctx;
      const step = 12;
      const dot = 3;
      for (let px = x + 4; px <= x + width - 4; px += step) {
        ctx.strokeRect(Math.round(px - dot / 2) + 0.5, y + 0.5, dot, dot);
        ctx.strokeRect(Math.round(px - dot / 2) + 0.5, y + height - dot - 0.5, dot, dot);
      }
      for (let py = y + 4; py <= y + height - 4; py += step) {
        ctx.strokeRect(x + 0.5, Math.round(py - dot / 2) + 0.5, dot, dot);
        ctx.strokeRect(x + width - dot - 0.5, Math.round(py - dot / 2) + 0.5, dot, dot);
      }
    }

    drawBubbleCornerMarks(x, y, width, height) {
      const ctx = this.ctx;
      const size = 3;
      [
        [x - 2, y - 2],
        [x + width - 1, y - 2],
        [x - 2, y + height - 1],
        [x + width - 1, y + height - 1]
      ].forEach(([markX, markY]) => {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(Math.round(markX), Math.round(markY), size, size);
      });
    }

    drawOperatorBubbleFrame(bubble, x, y, width, height, style) {
      const ctx = this.ctx;
      if (style === "operator-screen") {
        this.drawOperatorScreenFrame(x, y, width, height);
        return;
      }
      if (style === "operator-comment") {
        this.drawOperatorCommentFrame(bubble, x, y, width, height);
        return;
      }

      this.drawHeavyDosFrame(bubble, x, y, width, height);
      if (style === "operator-slash") {
        this.drawOperatorSlashFrame(bubble, x, y, width, height);
        return;
      }
      if (style === "operator-prompt") {
        this.drawOperatorPromptFrame(bubble, x, y, width, height);
        return;
      }

      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }

    drawOperatorCommentFrame(bubble, x, y, width, height) {
      const ctx = this.ctx;
      const scale = bubble.textScale || this.bubbleTextScale(bubble);
      const cellWidth = TERMINAL_FONT_WIDTH * scale;
      const cellHeight = TERMINAL_FONT_HEIGHT * scale;
      if (this.terminalText) {
        const columns = bubble.terminalColumns || Math.max(6, Math.round(width / cellWidth));
        const rows = bubble.terminalRows || Math.max(4, Math.round(height / cellHeight));
        const left = Math.round(x);
        const top = Math.round(y);
        this.terminalText.drawCodeLine([0x2f, ...Array(columns - 1).fill(0x2a)], left, top, scale, ctx.strokeStyle, {
          advance: TERMINAL_FONT_WIDTH
        });
        for (let row = 1; row < rows - 1; row += 1) {
          const yPos = top + row * cellHeight;
          this.terminalText.drawGlyph(0x2a, left, yPos, scale, ctx.strokeStyle);
          this.terminalText.drawGlyph(0x2a, left + (columns - 1) * cellWidth, yPos, scale, ctx.strokeStyle);
        }
        this.terminalText.drawCodeLine([...Array(columns - 1).fill(0x2a), 0x2f], left, top + (rows - 1) * cellHeight, scale, ctx.strokeStyle, {
          advance: TERMINAL_FONT_WIDTH
        });
        return;
      }

      ctx.save();
      ctx.lineWidth = 2;
      const starStep = Math.max(8, cellWidth * 0.9);
      for (let px = x + 18; px <= x + width - 18; px += starStep) {
        ctx.beginPath();
        ctx.moveTo(px - 3, y + 2);
        ctx.lineTo(px + 3, y + 8);
        ctx.moveTo(px + 3, y + 2);
        ctx.lineTo(px - 3, y + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px - 3, y + height - 8);
        ctx.lineTo(px + 3, y + height - 2);
        ctx.moveTo(px + 3, y + height - 8);
        ctx.lineTo(px - 3, y + height - 2);
        ctx.stroke();
      }
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      ctx.restore();
    }

    drawOperatorSlashFrame(bubble, x, y, width, height) {
      const ctx = this.ctx;
      const scale = bubble.textScale || this.bubbleTextScale(bubble);
      const cellWidth = TERMINAL_FONT_WIDTH * scale;
      const cellHeight = TERMINAL_FONT_HEIGHT * scale;
      if (this.terminalText) {
        const columns = Math.max(4, Math.round(width / cellWidth));
        const rows = Math.max(3, Math.round(height / cellHeight));
        const slashPattern = Array.from({ length: columns }, (_, index) => index % 2 === 0 ? 0x5c : 0x2f);
        const backslashPattern = Array.from({ length: columns }, (_, index) => index % 2 === 0 ? 0x2f : 0x5c);
        this.terminalText.drawCodeLine(slashPattern, Math.round(x), Math.round(y - cellHeight * 0.78), scale, ctx.strokeStyle, {
          advance: TERMINAL_FONT_WIDTH
        });
        this.terminalText.drawCodeLine(backslashPattern, Math.round(x), Math.round(y + height + cellHeight * 0.18), scale, ctx.strokeStyle, {
          advance: TERMINAL_FONT_WIDTH
        });
        for (let row = 1; row < rows - 1; row += 1) {
          const code = row % 2 === 0 ? 0x5c : 0x2f;
          this.terminalText.drawGlyph(code, Math.round(x - cellWidth * 0.88), Math.round(y + row * cellHeight), scale, ctx.strokeStyle);
          this.terminalText.drawGlyph(code === 0x5c ? 0x2f : 0x5c, Math.round(x + width + cellWidth * 0.1), Math.round(y + row * cellHeight), scale, ctx.strokeStyle);
        }
        return;
      }

      this.drawOperatorSlashFallback(x, y, width, height);
    }

    drawOperatorSlashFallback(x, y, width, height) {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineWidth = 2;
      for (let px = x + 4; px <= x + width - 4; px += 10) {
        ctx.beginPath();
        ctx.moveTo(px, y - 8);
        ctx.lineTo(px + 7, y - 1);
        ctx.moveTo(px + 2, y + height + 8);
        ctx.lineTo(px + 9, y + height + 1);
        ctx.stroke();
      }
      for (let py = y + 8; py <= y + height - 8; py += 12) {
        ctx.beginPath();
        ctx.moveTo(x - 8, py - 4);
        ctx.lineTo(x - 1, py + 3);
        ctx.moveTo(x + width + 1, py - 4);
        ctx.lineTo(x + width + 8, py + 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawOperatorPromptFrame(bubble, x, y, width, height) {
      const ctx = this.ctx;
      const scale = bubble.textScale || this.bubbleTextScale(bubble);
      const cellWidth = TERMINAL_FONT_WIDTH * scale;
      const cellHeight = TERMINAL_FONT_HEIGHT * scale;
      const gutterWidth = Math.max(cellWidth * 4, 30);
      ctx.save();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + gutterWidth + 0.5, y + 1);
      ctx.lineTo(x + gutterWidth + 0.5, y + height - 1);
      ctx.stroke();
      ctx.lineWidth = 1;
      if (this.terminalText) {
        this.terminalText.drawText(["C:\\>"], x + cellWidth * 0.7, y + cellHeight * 0.7, scale, ctx.strokeStyle, {
          uppercase: true,
          advance: TERMINAL_FONT_WIDTH,
          lineAdvance: TERMINAL_FONT_HEIGHT
        });
        const rows = Math.max(3, Math.round(height / cellHeight));
        for (let row = 2; row < rows - 1; row += 1) {
          this.terminalText.drawCodeLine([0x2f, 0x2f], x + cellWidth, y + row * cellHeight, scale, ctx.strokeStyle, {
            advance: TERMINAL_FONT_WIDTH
          });
        }
      } else {
        ctx.font = `${Math.max(10, cellHeight * 0.8)}px ${this.fontFamily}`;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText("C:\\>", x + 8, y + 12);
        for (let py = y + 42; py <= y + height - 18; py += 18) {
          ctx.fillText("//", x + 10, py);
        }
      }
      ctx.restore();
    }

    drawOperatorScreenFrame(x, y, width, height) {
      const ctx = this.ctx;
      const corner = Math.min(34, Math.max(18, Math.min(width, height) * 0.22));
      const notch = 7;
      ctx.save();
      ctx.lineWidth = 2;
      [
        [x - notch, y - notch, 1, 1],
        [x + width + notch, y - notch, -1, 1],
        [x - notch, y + height + notch, 1, -1],
        [x + width + notch, y + height + notch, -1, -1]
      ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * corner);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + sx * corner, cy);
        ctx.stroke();
      });
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.strokeRect(x + 5.5, y + 5.5, width - 11, height - 11);
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawOperatorAddressTail(tail, bubble, style) {
      if (style === "operator-slash") {
        this.drawOperatorSlashTail(tail, bubble);
        return;
      }
      if (style === "operator-prompt") {
        this.drawOperatorPromptTail(tail);
        return;
      }
      if (style === "operator-screen") {
        this.drawOperatorScreenTail(tail);
        return;
      }
      if (style === "operator-comment") {
        this.drawOperatorCommentTail(tail, bubble);
      }
    }

    drawOperatorSlashTail(tail, bubble) {
      const ctx = this.ctx;
      const start = {
        x: (tail.baseA.x + tail.baseB.x) / 2,
        y: (tail.baseA.y + tail.baseB.y) / 2
      };
      const amounts = this.decorativeTailAmounts(tail, 5, {
        range: [0.1, 0.76],
        minTipDistance: 18
      });
      if (this.terminalText) {
        const scale = Math.max(1, Math.round((bubble.textScale || this.bubbleTextScale(bubble)) * 0.78));
        amounts.forEach((amount, index) => {
          const code = index % 2 === 0 ? 0x5c : 0x2f;
          const x = lerp(start.x, tail.tip.x, amount) - TERMINAL_FONT_WIDTH * scale / 2;
          const y = lerp(start.y, tail.tip.y, amount) - TERMINAL_FONT_HEIGHT * scale / 2;
          this.terminalText.drawGlyph(code, Math.round(x), Math.round(y), scale, ctx.strokeStyle);
        });
        return;
      }

      ctx.save();
      ctx.lineWidth = 2;
      amounts.forEach((amount, index) => {
        const x = lerp(start.x, tail.tip.x, amount);
        const y = lerp(start.y, tail.tip.y, amount);
        ctx.beginPath();
        if (index % 2 === 0) {
          ctx.moveTo(x - 5, y - 5);
          ctx.lineTo(x + 5, y + 5);
        } else {
          ctx.moveTo(x + 5, y - 5);
          ctx.lineTo(x - 5, y + 5);
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    drawOperatorPromptTail(tail) {
      const ctx = this.ctx;
      const start = {
        x: (tail.baseA.x + tail.baseB.x) / 2,
        y: (tail.baseA.y + tail.baseB.y) / 2
      };
      const elbow = {
        x: lerp(start.x, tail.tip.x, 0.54),
        y: start.y
      };
      ctx.save();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(elbow.x, elbow.y);
      ctx.lineTo(tail.tip.x, tail.tip.y);
      ctx.stroke();
      ctx.lineWidth = 1;
      const arrow = 7;
      ctx.beginPath();
      ctx.moveTo(tail.tip.x - tail.direction * arrow, tail.tip.y - arrow);
      ctx.lineTo(tail.tip.x, tail.tip.y);
      ctx.lineTo(tail.tip.x - tail.direction * arrow, tail.tip.y + arrow);
      ctx.stroke();
      ctx.restore();
    }

    drawOperatorScreenTail(tail) {
      const ctx = this.ctx;
      const start = {
        x: (tail.baseA.x + tail.baseB.x) / 2,
        y: (tail.baseA.y + tail.baseB.y) / 2
      };
      const mid = {
        x: lerp(start.x, tail.tip.x, 0.5),
        y: lerp(start.y, tail.tip.y, 0.5)
      };
      ctx.save();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(tail.tip.x, tail.tip.y);
      ctx.stroke();
      ctx.strokeRect(Math.round(mid.x - 4) + 0.5, Math.round(mid.y - 4) + 0.5, 8, 8);
      ctx.beginPath();
      ctx.moveTo(tail.tip.x - 6, tail.tip.y);
      ctx.lineTo(tail.tip.x + 6, tail.tip.y);
      ctx.moveTo(tail.tip.x, tail.tip.y - 6);
      ctx.lineTo(tail.tip.x, tail.tip.y + 6);
      ctx.stroke();
      ctx.restore();
    }

    drawOperatorCommentTail(tail, bubble) {
      const ctx = this.ctx;
      const start = {
        x: (tail.baseA.x + tail.baseB.x) / 2,
        y: (tail.baseA.y + tail.baseB.y) / 2
      };
      const mid = {
        x: lerp(start.x, tail.tip.x, 0.42),
        y: lerp(start.y, tail.tip.y, 0.42)
      };
      ctx.save();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(tail.tip.x, tail.tip.y);
      ctx.stroke();
      if (this.terminalText) {
        const scale = Math.max(1, Math.round((bubble.textScale || this.bubbleTextScale(bubble)) * 0.86));
        this.terminalText.drawGlyph(0x14, Math.round(mid.x - TERMINAL_FONT_WIDTH * scale / 2), Math.round(mid.y - TERMINAL_FONT_HEIGHT * scale / 2), scale, ctx.strokeStyle);
      } else {
        ctx.font = `700 18px ${this.fontFamily}`;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText("\u00b6", mid.x - 6, mid.y - 9);
      }
      ctx.restore();
    }

    drawSpeakerProxy(proxy) {
      const ctx = this.ctx;
      const size = Math.round(proxy.size || 28);
      const x = Math.round(proxy.x - size / 2);
      const y = Math.round(proxy.y - size / 2);
      const pixel = Math.max(1, Math.floor(size / 14));
      const bodyX = Math.round(proxy.x - SOURCE_WIDTH * pixel / 2);
      const bodyY = Math.round(proxy.y - SOURCE_HEIGHT * pixel / 2);
      const glyph = typeof proxy.glyph === "string" && glyphVariants[proxy.glyph]
        ? glyphVariants[proxy.glyph]
        : proxy.glyph?.sourcePixels
        ? proxy.glyph
        : glyphVariants.soh;
      const bodyPixels = glyph.faceMode === "negative"
        ? filledGlyphPixels(glyph)
        : glyph.bodyPixels || glyph.sourcePixels || [];
      const mouth = Array.isArray(proxy.mouth) ? proxy.mouth : mouthFrames.smile;
      const bodyColor = proxy.color || this.defaultColor;
      const faceColor = glyph.faceMode === "negative" ? "#000000" : bodyColor;
      const eyeOffset = proxy.eyeOffset || { x: 0, y: 0 };

      ctx.save();
      ctx.fillStyle = this.background;
      ctx.shadowColor = "rgba(85, 255, 255, 0.32)";
      ctx.shadowBlur = 8;
      ctx.fillRect(x, y, size, size);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = proxy.color || this.defaultColor;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      ctx.fillStyle = bodyColor;
      bodyPixels.forEach((bodyPixel) => {
        ctx.fillRect(bodyX + bodyPixel.x * pixel, bodyY + bodyPixel.y * pixel, pixel, pixel);
      });
      ctx.fillStyle = faceColor;
      baseEyes.forEach((eye) => {
        const eyeX = clamp(eye.x + (eyeOffset.x || 0), 2, 7);
        const eyeY = clamp(eye.y + (eyeOffset.y || 0), 2, 4);
        ctx.fillRect(bodyX + eyeX * pixel, bodyY + eyeY * pixel, pixel, pixel);
      });
      mouth.forEach((mouthPixel) => {
        ctx.fillRect(bodyX + mouthPixel.x * pixel, bodyY + mouthPixel.y * pixel, pixel, pixel);
      });
      if (proxy.crown) {
        ctx.fillStyle = vgaColor(0x2b);
        ctx.fillRect(bodyX + 3 * pixel, bodyY - pixel, 4 * pixel, pixel);
        ctx.fillRect(bodyX + 5 * pixel, bodyY - 2 * pixel, pixel, pixel * 2);
      }
      ctx.restore();
    }
  }

  const motionRegistry = new Map();

  function isElementLike(value) {
    return Boolean(value && typeof value.getBoundingClientRect === "function");
  }

  function isDomRange(value) {
    return Boolean(value && typeof value.getBoundingClientRect === "function" && typeof value.setStart === "function");
  }

  function queryTarget(selector) {
    if (typeof selector !== "string" || !selector.trim()) {
      return null;
    }
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  function targetRect(target, context = {}) {
    if (typeof target === "function") {
      return targetRect(target(context), context);
    }
    if (!target) {
      return null;
    }
    if (typeof target === "string") {
      if (context.runtime?.anchors?.has(target)) {
        const anchor = context.runtime.anchors.get(target);
        return targetRect(anchor.target, { ...context, anchor });
      }
      return targetRect(queryTarget(target), context);
    }
    if (target.anchor !== undefined) {
      return targetRect(target.anchor, context);
    }
    if (target.element) {
      return targetRect(target.element, context);
    }
    if (isElementLike(target) || isDomRange(target)) {
      return target.getBoundingClientRect();
    }
    if (Number.isFinite(Number(target.left)) && Number.isFinite(Number(target.top))) {
      return {
        left: Number(target.left),
        top: Number(target.top),
        width: Number(target.width) || 0,
        height: Number(target.height) || 0,
        right: Number(target.right) || Number(target.left) + (Number(target.width) || 0),
        bottom: Number(target.bottom) || Number(target.top) + (Number(target.height) || 0)
      };
    }
    if (Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y)) && Number.isFinite(Number(target.width)) && Number.isFinite(Number(target.height))) {
      return {
        left: Number(target.x),
        top: Number(target.y),
        width: Number(target.width),
        height: Number(target.height),
        right: Number(target.x) + Number(target.width),
        bottom: Number(target.y) + Number(target.height)
      };
    }
    return null;
  }

  function targetLabel(target) {
    if (typeof target === "string") {
      return target;
    }
    if (!target || typeof target !== "object") {
      return String(target ?? "unknown");
    }
    if (target.selector) {
      return target.selector;
    }
    if (target.id) {
      return String(target.id);
    }
    if (target.anchor) {
      return targetLabel(target.anchor);
    }
    if (target.element?.id) {
      return `#${target.element.id}`;
    }
    return target.constructor?.name || "object target";
  }

  function isAnchorReference(target) {
    if (typeof target === "string" || isElementLike(target) || isDomRange(target)) {
      return true;
    }
    if (!target || typeof target !== "object") {
      return false;
    }
    return target.anchor !== undefined || target.element || target.range || target.selector;
  }

  function normalizeSceneDesign(options = {}) {
    const source = options.design || options.designSize || options;
    const width = Number(source.width ?? source.designWidth ?? options.designWidth) || 900;
    const height = Number(source.height ?? source.designHeight ?? options.designHeight) || 360;
    return {
      width: Math.max(1, width),
      height: Math.max(1, height)
    };
  }

  function sceneLayout(rect, options = {}) {
    const design = normalizeSceneDesign(options);
    const width = Math.max(1, Number(rect?.width) || design.width);
    const height = Math.max(1, Number(rect?.height) || design.height);
    const scaleX = width / design.width;
    const scaleY = height / design.height;
    const aspect = width / height;
    return {
      width,
      height,
      designWidth: design.width,
      designHeight: design.height,
      scaleX,
      scaleY,
      scale: Math.min(scaleX, scaleY),
      fillScale: Math.max(scaleX, scaleY),
      orientation: aspect < 0.82 ? "portrait" : aspect < 1.35 ? "compact" : "landscape",
      aspect
    };
  }

  function shouldProjectDesignPoint(point, context = {}) {
    if (!point || point.space === "screen" || point.screen === true || point.xRatio !== undefined || point.yRatio !== undefined) {
      return false;
    }
    return point.space === "design" ||
      point.design === true ||
      context.designCoordinates === true ||
      context.runtime?.responsiveCoordinates === true;
  }

  function projectDesignPoint(point, rect, context = {}) {
    if (!shouldProjectDesignPoint(point, context)) {
      return point;
    }
    const layout = context.layout || context.runtime?.layoutFor?.(rect) || sceneLayout(rect, context);
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return point;
    }

    const safeMargin = Number(point.safeMargin ?? context.runtime?.safeMargin ?? 0) || 0;
    return {
      x: clamp(x / layout.designWidth * layout.width, safeMargin, layout.width - safeMargin),
      y: clamp(y / layout.designHeight * layout.height, safeMargin, layout.height - safeMargin)
    };
  }

  function rectToSceneRect(domRect, context = {}) {
    if (!domRect) {
      return null;
    }
    const canvasRect = context.canvasRect || context.runtime?.canvas?.getBoundingClientRect?.() || { left: 0, top: 0 };
    return {
      x: domRect.left - (canvasRect.left || 0),
      y: domRect.top - (canvasRect.top || 0),
      width: domRect.width || Math.max(0, (domRect.right || 0) - (domRect.left || 0)),
      height: domRect.height || Math.max(0, (domRect.bottom || 0) - (domRect.top || 0))
    };
  }

  function anchorPointFromRect(anchorRect, options = {}) {
    const at = String(options.at || options.side || "center").toLowerCase();
    const gap = Number(options.gap ?? options.margin ?? 0) || 0;
    let x = anchorRect.x + anchorRect.width / 2;
    let y = anchorRect.y + anchorRect.height / 2;

    if (at.includes("left")) {
      x = anchorRect.x - gap;
    } else if (at.includes("right")) {
      x = anchorRect.x + anchorRect.width + gap;
    }
    if (at.includes("top") || at === "above") {
      y = anchorRect.y - gap;
    } else if (at.includes("bottom") || at === "below") {
      y = anchorRect.y + anchorRect.height + gap;
    }

    if (at === "above") {
      x = anchorRect.x + anchorRect.width / 2;
    } else if (at === "below") {
      x = anchorRect.x + anchorRect.width / 2;
    } else if (at === "left") {
      y = anchorRect.y + anchorRect.height / 2;
    } else if (at === "right") {
      y = anchorRect.y + anchorRect.height / 2;
    }

    return { x, y };
  }

  function actorAnchorOffset(actorState, actorAt) {
    if (!actorState || !actorAt) {
      return { x: 0, y: 0 };
    }
    const at = String(actorAt).toLowerCase();
    const scale = actorState.scale || 1;
    const width = SOURCE_WIDTH * scale;
    const height = SOURCE_HEIGHT * scale;
    const centerX = width / 2;
    const centerY = height / 2;
    if (at === "center") {
      return { x: centerX, y: centerY };
    }
    if (at === "head") {
      return { x: 5 * scale, y: 2.4 * scale };
    }
    if (at === "mouth") {
      return { x: 5 * scale, y: 6.2 * scale };
    }
    if (at === "feet" || at === "foot" || at === "bottom") {
      return { x: centerX, y: height };
    }
    if (at === "top") {
      return { x: centerX, y: 0 };
    }
    if (at === "left") {
      return { x: 0, y: centerY };
    }
    if (at === "right") {
      return { x: width, y: centerY };
    }
    if (at === "top-right") {
      return { x: width, y: 0 };
    }
    if (at === "bottom-left") {
      return { x: 0, y: height };
    }
    if (at === "bottom-right") {
      return { x: width, y: height };
    }
    return { x: 0, y: 0 };
  }

  function applyPointOffsets(point, options = {}, context = {}) {
    const actorOffset = actorAnchorOffset(context.actorState, options.actorAt || options.actorAnchor);
    return {
      x: point.x + (Number(options.dx ?? options.offsetX) || 0) - actorOffset.x,
      y: point.y + (Number(options.dy ?? options.offsetY) || 0) - actorOffset.y
    };
  }

  function resolveAnchorPoint(target, rect, fallback = { x: 0, y: 0 }, options = {}, context = {}) {
    const registered = typeof target === "string" ? context.runtime?.anchors?.get(target) : null;
    const anchorOptions = registered ? { ...registered, ...options } : options;
    const anchorTarget = registered ? registered.target : target;
    const anchorRect = rectToSceneRect(targetRect(anchorTarget, { ...context, anchor: registered }), context);
    if (!anchorRect) {
      return { ...fallback };
    }
    return applyPointOffsets(anchorPointFromRect(anchorRect, anchorOptions), anchorOptions, context);
  }

  function resolveScenePoint(point, rect, fallback = { x: 0, y: 0 }, context = {}) {
    if (typeof point === "function") {
      return resolveScenePoint(point(rect, context), rect, fallback, context);
    }
    if (typeof point === "string" || isElementLike(point) || isDomRange(point)) {
      return resolveAnchorPoint(point, rect, fallback, {}, context);
    }
    if (!point || typeof point !== "object") {
      return { ...fallback };
    }
    if (point.anchor !== undefined || point.element || point.range) {
      return resolveAnchorPoint(point.anchor ?? point.element ?? point.range, rect, fallback, point, context);
    }

    const rawPoint = {
      x: point.xRatio !== undefined ? rect.width * Number(point.xRatio) : Number(point.x),
      y: point.yRatio !== undefined ? rect.height * Number(point.yRatio) : Number(point.y)
    };
    const projectedPoint = projectDesignPoint({
      ...point,
      x: rawPoint.x,
      y: rawPoint.y
    }, rect, context);
    return applyPointOffsets({
      x: Number.isFinite(projectedPoint.x) ? projectedPoint.x : fallback.x,
      y: Number.isFinite(projectedPoint.y) ? projectedPoint.y : fallback.y
    }, point, context);
  }

  function findTextRange(root, text, options = {}) {
    const rootElement = typeof root === "string" ? queryTarget(root) : root || document.body;
    const needle = String(text || "");
    if (!rootElement || !needle) {
      return null;
    }
    const occurrence = Math.max(0, Math.floor(Number(options.occurrence) || 0));
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
    let seen = 0;
    let node = walker.nextNode();
    while (node) {
      let index = node.nodeValue.indexOf(needle);
      while (index >= 0) {
        if (seen === occurrence) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + needle.length);
          return range;
        }
        seen += 1;
        index = node.nodeValue.indexOf(needle, index + needle.length);
      }
      node = walker.nextNode();
    }
    return null;
  }

  function textAnchor(root, text, options = {}) {
    return () => findTextRange(root, text, options);
  }

  function registerMotion(id, definition) {
    if (!id || !definition || typeof definition.apply !== "function") {
      return null;
    }

    if (motionRegistry.has(id)) throw new Error(`Duplicate shared motion ID: ${id}`);

    const normalized = {
      id,
      duration: 1000,
      tags: [],
      ...definition
    };
    normalized.tags = Array.isArray(normalized.tags)
      ? normalized.tags.filter(Boolean)
      : String(normalized.tags || "").split(/\s+/).filter(Boolean);
    motionRegistry.set(id, normalized);
    return normalized;
  }

  function getMotion(id) {
    return motionRegistry.get(id) || null;
  }

  // Sample the named performance while a scene owns the root position/scale.
  // Full SceneScript travel still uses motion.apply; pose consumers must not
  // rebuild its context or undo its translation separately in each renderer.
  function applyMotionPose(id, state, { progress, gaitProgress = progress, motionWeight = 1,
    facing = 1, now = 0, elapsed, actor = state } = {}) {
    const motion = getMotion(id);
    if (!motion) throw new Error(`Shared Soh motion unavailable: ${id}`);
    if (!Number.isFinite(progress) || progress < 0 || progress > 1 ||
        !Number.isFinite(gaitProgress) || !Number.isFinite(motionWeight) || motionWeight < 0 || motionWeight > 1 ||
        ![-1, 0, 1].includes(facing) || !Number.isFinite(now) ||
        (elapsed !== undefined && !Number.isFinite(elapsed))) throw new TypeError("Invalid shared motion pose sample.");
    const { x, y, scale } = state;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale) || scale <= 0) {
      throw new TypeError("A shared motion pose requires a finite root and positive scale.");
    }
    try {
      motion.apply(state, { actor, now, elapsed: elapsed ?? progress * motion.duration,
        progress, gaitProgress, motionWeight, from: { x, y }, to: { x: x + facing, y },
        fromScale: scale, toScale: scale, options: {}, mouths: mouthFrames });
    } finally {
      state.x = x; state.y = y; state.scale = scale;
    }
    return state;
  }

  function listMotions() {
    return [...motionRegistry.values()].map((motion) => {
      const { apply, ...metadata } = motion;
      return clone(metadata);
    });
  }

  const chopAnimationRegistry = new Map();
  const chopAnimationLoadPromises = new Map();

  function normalizeTiming(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function normalizeChopAnimationAsset(asset) {
    if (!asset || typeof asset !== "object" || typeof asset.id !== "string" || !asset.id.trim()) {
      return null;
    }

    const normalized = {
      version: 1,
      kind: "loop",
      title: asset.id,
      duration: 1000,
      tags: [],
      actor: {},
      attachments: [],
      effects: [],
      reducedMotion: null,
      ...asset,
      id: asset.id.trim()
    };
    normalized.duration = Math.max(120, normalizeTiming(normalized.duration, 1000));
    normalized.tags = Array.isArray(normalized.tags)
      ? normalized.tags.filter(Boolean)
      : String(normalized.tags || "").split(/\s+/).filter(Boolean);
    normalized.actor = normalized.actor && typeof normalized.actor === "object" ? normalized.actor : {};
    normalized.actor.keyframes = Array.isArray(normalized.actor.keyframes)
      ? normalized.actor.keyframes
      : [];
    normalized.attachments = Array.isArray(normalized.attachments) ? normalized.attachments : [];
    normalized.effects = Array.isArray(normalized.effects) ? normalized.effects : [];
    return normalized;
  }

  function registerChopAnimation(asset) {
    const normalized = normalizeChopAnimationAsset(asset);
    if (!normalized) {
      return null;
    }

    chopAnimationRegistry.set(normalized.id, normalized);
    return normalized;
  }

  async function loadChopAnimation(url, options = {}) {
    if (!url) {
      return null;
    }

    const cacheKey = String(url);
    if (!chopAnimationLoadPromises.has(cacheKey)) {
      chopAnimationLoadPromises.set(cacheKey, fetch(cacheKey, {
        cache: options.cache || "default",
        credentials: options.credentials || "same-origin"
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Chop animation asset failed to load: ${cacheKey} (${response.status})`);
          }
          return response.json();
        })
        .then((asset) => registerChopAnimation(asset))
        .finally(() => {
          chopAnimationLoadPromises.delete(cacheKey);
        }));
    }

    return chopAnimationLoadPromises.get(cacheKey);
  }

  function getChopAnimation(id) {
    return chopAnimationRegistry.get(id) || null;
  }

  function listChopAnimations() {
    return [...chopAnimationRegistry.values()].map((asset) => {
      const { actor, attachments, effects, ...metadata } = asset;
      return {
        ...clone(metadata),
        actorKeyframes: Array.isArray(actor?.keyframes) ? actor.keyframes.length : 0,
        attachments: Array.isArray(attachments) ? attachments.length : 0,
        effects: Array.isArray(effects) ? effects.length : 0
      };
    });
  }

  function normalizeKeyframeAt(frame, index, count) {
    const at = Number(frame?.at);
    if (Number.isFinite(at)) {
      return clamp(at, 0, 1);
    }

    return count <= 1 ? 0 : index / (count - 1);
  }

  function orderedKeyframes(frames) {
    const safeFrames = Array.isArray(frames) ? frames : [];
    return safeFrames
      .map((frame, index) => ({
        ...frame,
        at: normalizeKeyframeAt(frame, index, safeFrames.length)
      }))
      .sort((a, b) => a.at - b.at);
  }

  function keyframedValue(frames, property, progress, fallback) {
    const keyed = orderedKeyframes(frames).filter((frame) => frame[property] !== undefined);
    if (keyed.length === 0) {
      return fallback;
    }

    if (progress <= keyed[0].at) {
      return keyed[0][property];
    }

    for (let index = 1; index < keyed.length; index += 1) {
      const previous = keyed[index - 1];
      const next = keyed[index];
      if (progress > next.at) {
        continue;
      }

      const local = (progress - previous.at) / Math.max(0.0001, next.at - previous.at);
      if (typeof previous[property] === "number" && typeof next[property] === "number") {
        return lerp(previous[property], next[property], easeInOut(local));
      }

      return local < 0.5 ? previous[property] : next[property];
    }

    return keyed[keyed.length - 1][property];
  }

  function animationValue(value, progress, fallback) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const from = Number(value.from ?? value.start);
      const to = Number(value.to ?? value.end);
      if (Number.isFinite(from) && Number.isFinite(to)) {
        const eased = value.easing === "linear" ? progress : easeInOut(progress);
        return lerp(from, to, eased);
      }

      if (Array.isArray(value.keyframes)) {
        return keyframedValue(value.keyframes, "value", progress, fallback);
      }
    }

    return value ?? fallback;
  }

  function animationMouth(asset, progress, fallback) {
    const mouth = keyframedValue(asset.actor?.keyframes, "mouth", progress, fallback);
    return typeof mouth === "string" && mouthFrames[mouth] ? mouthFrames[mouth] : mouth;
  }

  function animatedAttachments(asset, progress, baseAttachments) {
    const attachments = Array.isArray(baseAttachments) ? baseAttachments.slice() : [];
    asset.attachments.forEach((attachment) => {
      attachments.push({
        ...attachment,
        tilt: Number(animationValue(attachment.tilt, progress, attachment.tilt || 0)) || 0,
        scale: Number(animationValue(attachment.scale, progress, attachment.scale || 1)) || 1,
        offset: {
          x: Number(animationValue(attachment.offsetX, progress, attachment.offset?.x || 0)) || 0,
          y: Number(animationValue(attachment.offsetY, progress, attachment.offset?.y || 0)) || 0
        }
      });
    });
    return attachments;
  }

  function applyChopAnimation(assetOrId, state, context = {}) {
    const asset = typeof assetOrId === "string" ? getChopAnimation(assetOrId) : normalizeChopAnimationAsset(assetOrId);
    if (!asset || !state) {
      return { state, effects: [] };
    }

    const duration = animationDuration(asset.duration);
    const elapsed = normalizeTiming(context.elapsed, 0);
    const phase = Number(context.phase) || 0;
    const progress = Number.isFinite(context.progress)
      ? clamp(context.progress, 0, 1)
      : asset.kind === "transition"
        ? clamp((elapsed + phase * duration) / duration, 0, 1)
        : ((elapsed + phase * duration) % duration) / duration;
    const actorFrames = asset.actor?.keyframes || [];
    const baseX = Number(context.baseX ?? state.x) || 0;
    const baseY = Number(context.baseY ?? state.y) || 0;
    const baseRotation = Number(context.baseRotation ?? state.rotation) || 0;
    const baseScaleX = Number(context.baseScaleX ?? state.scaleX ?? 1) || 1;
    const baseScaleY = Number(context.baseScaleY ?? state.scaleY ?? 1) || 1;
    const baseAlpha = Number(context.baseAlpha ?? state.alpha ?? 1);

    state.x = baseX + (Number(keyframedValue(actorFrames, "x", progress, 0)) || 0);
    state.y = baseY + (Number(keyframedValue(actorFrames, "y", progress, 0)) || 0);
    state.rotation = baseRotation + (Number(keyframedValue(actorFrames, "rotation", progress, 0)) || 0);
    state.scaleX = baseScaleX * (Number(keyframedValue(actorFrames, "scaleX", progress, 1)) || 1);
    state.scaleY = baseScaleY * (Number(keyframedValue(actorFrames, "scaleY", progress, 1)) || 1);
    state.alpha = Number.isFinite(baseAlpha) ? baseAlpha : 1;
    if (asset.actor.glow !== undefined) {
      const glow = normalizeCharacterGlow(asset.actor.glow);
      state.glow = glow ? normalizeCharacterGlow({ ...glow, intensity: keyframedValue(actorFrames, "glowIntensity", progress, glow.intensity) }) : null;
    }
    state.mouth = animationMouth(asset, progress, state.mouth);
    const speaking = keyframedValue(actorFrames, "speaking", progress, false);
    if (speaking) {
      state.spokenAt = context.now || performance.now();
      state.speakingUntil = (context.now || performance.now()) + 240;
      state.mouthPolicy ||= "subtle";
    }

    const eyeX = keyframedValue(actorFrames, "eyeX", progress, null);
    const eyeY = keyframedValue(actorFrames, "eyeY", progress, null);
    const eyePixels = keyframedValue(actorFrames, "eyePixels", progress, null);
    const eyeColor = keyframedValue(actorFrames, "eyeColor", progress, null);
    const mouthColor = keyframedValue(actorFrames, "mouthColor", progress, null);
    if (Array.isArray(eyePixels)) {
      state.eyePixels = eyePixels;
    }
    if (eyeColor) {
      state.eyeColor = eyeColor;
    }
    if (mouthColor) {
      state.mouthColor = mouthColor === "body" ? state.bodyColor : mouthColor;
      state.allowCustomMouthColor = true;
    }
    if (Number.isFinite(Number(eyeX)) || Number.isFinite(Number(eyeY))) {
      state.eyeOffset = {
        x: Number(eyeX) || 0,
        y: Number(eyeY) || 0
      };
    }

    // Portable clips can delegate body pose to a shared motion. Keyframes still
    // own translation and props; gait math is authored exactly once.
    if (asset.actor.motion) {
      const motion = getMotion(asset.actor.motion.key);
      if (!motion?.catalog?.poseOnly) throw new Error(`Unsupported portable pose motion: ${asset.actor.motion.key}`);
      const direction = context.facing === -1 ? -1 : 1;
      const edge = clamp(Math.min(progress, 1 - progress) / 0.12, 0, 1);
      const pose = {};
      motion.apply(pose, {
        progress, gaitProgress: progress * asset.duration / motion.duration,
        motionWeight: asset.kind === "transition" ? edge * edge * (3 - 2 * edge) : 1,
        from: { x: 0, y: 0 }, to: { x: direction, y: 0 }, mouths: mouthFrames, options: {}
      });
      state.rotation += pose.rotation || 0;
      state.skewX = (Number(context.baseSkewX) || 0) + (pose.skewX || 0);
      state.scaleX *= pose.scaleX ?? 1;
      state.scaleY *= pose.scaleY ?? 1;
      state.eyeOffset = pose.eyeOffset;
    }
    state.attachments = animatedAttachments(asset, progress, context.baseAttachments || state.attachments || []);

    const effects = asset.effects
        .filter((effect) => {
          const at = Number(effect.at);
          if (!Number.isFinite(at)) {
            return true;
          }

          return Math.abs(progress - clamp(at, 0, 1)) <= Number(effect.window ?? 0.035);
        })
        .map((effect) => ({ ...effect, progress }));

    return { state, effects, progress };
  }

  registerMotion("walk", {
    catalog: { category: "locomotion", family: "locomotion.walk", status: "active", version: 1, summary: "Ordinary walking with gentle weight transfer. Canonical gait for scenes and presence clips.", preview: "travel", poseOnly: true },
    title: "Walk",
    duration: 1200,
    tags: ["locomotion", "movement", "walk"],
    apply(state, context) {
      const progress = clamp(context.progress, 0, 1);
      // One left/right weight transfer per gait cycle. Spatial callers supply
      // distance-derived phase; ordinary SceneScript travel uses authored time.
      const gaitProgress = context.gaitProgress ?? progress * (context.options?.duration || 1200) / 1200;
      const phase = gaitProgress * Math.PI * 2;
      const edge = clamp(Math.min(progress, 1 - progress) / 0.12, 0, 1);
      const weight = context.motionWeight ?? edge * edge * (3 - 2 * edge);
      const direction = Math.sign(context.to.x - context.from.x) || 1;
      const transfer = Math.sin(phase);
      const compression = (1 - Math.cos(phase * 2)) / 2;
      state.x = lerp(context.from.x, context.to.x, progress);
      state.y = lerp(context.from.y, context.to.y, progress);
      state.rotation = transfer * 0.018 * weight;
      state.skewX = -direction * 0.025 * weight;
      state.scaleX = 1 + compression * 0.006 * weight;
      state.scaleY = 1 - compression * 0.012 * weight;
      state.eyeOffset = { x: direction, y: 0 };
    }
  });

  registerMotion("run", {
    catalog: { category: "locomotion", family: "locomotion.run", status: "active", version: 1, summary: "Exaggerated hurried travel with a forward lean and six stride oscillations.", preview: "travel" },
    title: "Run",
    duration: 1200,
    tags: ["locomotion", "movement"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const stride = Math.sin(context.progress * Math.PI * 12);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) + Math.abs(stride) * 5;
      state.skewX = -0.22 * Math.sign(context.to.x - context.from.x || 1);
      state.scaleX = 1 + stride * 0.05;
      state.scaleY = 1 - Math.abs(stride) * 0.05;
      state.eyeOffset = { x: Math.sign(context.to.x - context.from.x || 1), y: 0 };
      state.mouth = context.mouths.smile;
    }
  });

  registerMotion("climb", {
    catalog: { category: "locomotion", family: "locomotion.climb", status: "active", version: 1, summary: "Vertical travel with alternating climbing effort and an upward gaze.", preview: "vertical" },
    title: "Climb",
    duration: 2200,
    tags: ["locomotion", "vertical"],
    apply(state, context) {
      const t = clamp(context.progress, 0, 1);
      const stride = Math.sin(t * Math.PI * 12);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t);
      state.rotation = stride * 0.045;
      state.scaleX = 1 + stride * 0.04;
      state.scaleY = 1 - Math.abs(stride) * 0.03;
      state.eyeOffset = { x: 0, y: -1 };
      state.mouth = context.mouths.hmm;
    }
  });

  registerMotion("trip", {
    catalog: { category: "reaction", family: "reaction.fall", status: "active", version: 1, summary: "A forward stumble, hop, and sideways fall.", preview: "travel" },
    title: "Trip",
    duration: 1150,
    tags: ["locomotion", "fall"],
    apply(state, context) {
      const t = context.progress;
      const travel = easeInOut(Math.min(t * 1.25, 1));
      const fall = smoothstep(clamp((t - 0.28) / 0.52, 0, 1));
      const hop = Math.sin(Math.PI * clamp((t - 0.18) / 0.34, 0, 1)) * 20;
      state.x = lerp(context.from.x, context.to.x, travel);
      state.y = lerp(context.from.y, context.to.y, travel) + fall * 42 - hop;
      state.rotation = fall * Math.PI * 0.5 * Math.sign(context.to.x - context.from.x || 1);
      state.skewX = t < 0.36 ? 0.28 : -0.1;
      state.scaleX = 1 + fall * 0.18;
      state.scaleY = 1 - fall * 0.16;
      state.pivotY = 12;
      state.mouth = fall > 0.25 ? context.mouths.surprise : context.mouths.smile;
      state.eyeOffset = fall > 0.45 ? { x: 0, y: 1 } : { x: Math.sign(context.to.x - context.from.x || 1), y: 0 };
    }
  });

  registerMotion("cartwheel", {
    catalog: { category: "locomotion", family: "locomotion.acrobatics", status: "active", version: 1, summary: "A full rotating cartwheel with a short hop.", preview: "travel" },
    title: "Cartwheel",
    duration: 1400,
    tags: ["locomotion", "spin"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const hop = Math.sin(Math.PI * context.progress) * 32;
      const direction = Math.sign(context.to.x - context.from.x || 1);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) - hop;
      state.rotation = direction * Math.PI * 2 * context.progress;
      state.pivotY = 6;
      state.mouth = context.progress > 0.72 ? context.mouths.surprise : context.mouths.smile;
      state.eyeOffset = { x: direction, y: context.progress > 0.45 ? -1 : 0 };
    }
  });

  registerMotion("jump", {
    catalog: { category: "locomotion", family: "locomotion.jump", status: "active", version: 1, summary: "A single arcing jump with squash and stretch.", preview: "travel" },
    title: "Jump",
    duration: 680,
    tags: ["locomotion", "emote"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const hop = Math.sin(Math.PI * context.progress) * 42;
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) - hop;
      state.scaleX = 1 + Math.sin(Math.PI * context.progress) * 0.08;
      state.scaleY = 1 - Math.sin(Math.PI * context.progress) * 0.08;
      state.mouth = context.mouths.surprise;
      state.eyeOffset = { x: 0, y: -1 };
    }
  });

  registerMotion("approach", {
    catalog: { category: "locomotion", family: "locomotion.approach", status: "active", version: 1, summary: "Move toward the foreground while growing to the destination scale.", preview: "approach" },
    title: "Approach Foreground",
    duration: 1100,
    tags: ["locomotion", "camera", "scale"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const attention = Math.sin(Math.PI * context.progress);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) - attention * 4;
      if (Number.isFinite(context.fromScale) && Number.isFinite(context.toScale)) {
        state.scale = lerp(context.fromScale, context.toScale, t);
      }
      state.eyeOffset = { x: 0, y: -1 };
      state.scaleX = 1 + attention * 0.035;
      state.scaleY = 1 - attention * 0.025;
      state.mouth = context.mouths.hmm;
    }
  });

  registerMotion("tiptoe", {
    catalog: { category: "locomotion", family: "locomotion.walk", status: "active", version: 1, variantOf: "motion.walk", summary: "Careful, raised steps for sneaking or approaching delicate objects.", preview: "travel" },
    title: "Tiptoe",
    duration: 1450,
    tags: ["locomotion", "careful", "movement"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const step = Math.sin(context.progress * Math.PI * 8);
      const direction = Math.sign(context.to.x - context.from.x || 1);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) - Math.max(0, step) * 8;
      state.rotation = -direction * 0.045 + step * 0.025;
      state.scaleX = 0.96 + Math.max(0, step) * 0.035;
      state.scaleY = 1.04 - Math.max(0, step) * 0.035;
      state.eyeOffset = { x: direction, y: -1 };
      state.mouth = context.mouths.hmm;
    }
  });

  registerMotion("nod", {
    catalog: { category: "idle", family: "idle.nod", status: "active", version: 1, summary: "Dip in quick agreement, then return to a settled standing pose.", preview: "stationary", poseOnly: true },
    title: "Nod", duration: 700, tags: ["idle", "agreement", "gesture"],
    apply(state, context) {
      const dip = Math.sin(Math.PI * clamp(context.progress, 0, 1)) ** 2;
      state.x = context.from.x;
      state.y = context.from.y + dip * 5;
      state.rotation = -dip * 0.065;
      state.scaleY = 1 - dip * 0.075;
      state.eyeOffset = { x: 0, y: dip > 0.4 ? 1 : 0 };
      state.mouth = context.mouths.smile;
    }
  });

  registerMotion("read", {
    catalog: { category: "idle", family: "idle.read", status: "active", version: 1, summary: "Read in place with small body movement and an attentive gaze.", preview: "stationary" },
    title: "Read", duration: 4200, tags: ["idle", "reading"],
    apply(state, context) {
      state.x = context.from.x;
      state.y = context.from.y + Math.sin(context.elapsed / 180) * 1.5;
      state.rotation = Math.sin(context.elapsed / 420) * 0.026;
      state.eyeOffset = { x: 1, y: 0 };
      state.mouth = context.mouths.hmm;
    }
  });

  registerMotion("inspect", {
    catalog: { category: "work", family: "work.observe", status: "active", version: 1, summary: "Lean toward a nearby instrument or small object, hold an attentive look, then settle back on planted feet.", preview: "stationary", poseOnly: true },
    title: "Inspect Closely", duration: 4800, tags: ["inspection", "careful", "observation"],
    apply(state, context) {
      const t=clamp(context.progress,0,1),weight=smoothstep(Math.min(t/.22,(1-t)/.2,1))*clamp(context.motionWeight??1,0,1);
      const direction=Math.sign(context.to.x-context.from.x)||1;
      state.x=context.from.x;state.y=context.from.y;
      state.skewX=-direction*.32*weight;
      state.scaleY=1-.035*weight;
      state.eyeOffset={x:direction,y:0};state.mouth=context.mouths.hmm;
    }
  });

  registerMotion("type", {
    catalog: { category: "work", family: "work.type", status: "active", version: 1, summary: "Type at a computer with small rhythmic taps.", preview: "stationary" },
    title: "Type", duration: 4200, tags: ["idle", "computer"],
    apply(state, context) {
      const step = Math.floor(context.elapsed / 120);
      state.x = context.from.x + (step % 2 ? -1 : 1);
      state.y = context.from.y + (step % 3 ? 0 : 1);
      state.rotation = (-2 + Math.sin(context.elapsed / 300) * 1.2) * Math.PI / 180;
      state.skewX = -0.08;
      state.eyeOffset = { x: 1, y: 1 };
      state.mouth = context.mouths.smile;
    }
  });

  registerMotion("sprint", {
    catalog: { category: "locomotion", family: "locomotion.run", status: "active", version: 1, variantOf: "motion.run", summary: "Fast comic travel with a strong lean and eight stride oscillations.", preview: "travel" },
    title: "Sprint",
    duration: 660,
    tags: ["locomotion", "fast", "movement"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const stride = Math.sin(context.progress * Math.PI * 16);
      const direction = Math.sign(context.to.x - context.from.x || 1);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) + Math.abs(stride) * 7;
      state.skewX = -direction * 0.42;
      state.rotation = -direction * 0.035;
      state.scaleX = 1.08 + stride * 0.06;
      state.scaleY = 0.92 - Math.abs(stride) * 0.04;
      state.eyeOffset = { x: direction, y: 0 };
      state.mouth = context.mouths.surprise;
    }
  });

  registerMotion("heave", {
    catalog: { category: "work", family: "work.lift", status: "active", version: 1, summary: "Strain, compress, and lift a heavy load.", preview: "stationary" },
    title: "Heave",
    duration: 1050,
    tags: ["emote", "lift", "effort"],
    apply(state, context) {
      const t = context.progress;
      const weight = clamp(context.motionWeight ?? 1, 0, 1);
      const strain = Math.sin(Math.PI * clamp(t / 0.72, 0, 1)) * weight;
      const lift = smoothstep(clamp((t - 0.5) / 0.5, 0, 1)) * weight;
      const direction = Math.sign(context.to.x - context.from.x || 1);
      state.x = lerp(context.from.x, context.to.x, easeInOut(t)) - direction * strain * 4;
      state.y = lerp(context.from.y, context.to.y, easeInOut(t)) + strain * 9 - lift * 7;
      state.rotation = -direction * strain * 0.08;
      state.skewX = direction * strain * 0.18;
      state.scaleX = 1 + strain * 0.12;
      state.scaleY = 1 - strain * 0.14;
      state.eyeOffset = { x: 0, y: strain > 0.35 ? 1 : 0 };
      state.mouth = strain > 0.2 ? context.mouths.unhappy : context.mouths.hmm;
    }
  });

  registerMotion("haul", {
    catalog: { category: "work", family: "work.haul", status: "active", version: 1, summary: "Drag a heavy load while leaning back and looking toward it.", preview: "travel" },
    title: "Haul",
    duration: 1850,
    tags: ["locomotion", "heavy", "movement"],
    apply(state, context) {
      const t = easeInOut(context.progress);
      const strain = Math.abs(Math.sin(context.progress * Math.PI * 7));
      const direction = Math.sign(context.to.x - context.from.x || 1);
      state.x = lerp(context.from.x, context.to.x, t);
      state.y = lerp(context.from.y, context.to.y, t) + strain * 5;
      state.rotation = direction * 0.075;
      state.skewX = direction * 0.32;
      state.scaleX = 1.08 + strain * 0.06;
      state.scaleY = 0.92 - strain * 0.045;
      state.eyeOffset = { x: -direction, y: 1 };
      state.mouth = context.mouths.unhappy;
      if (Array.isArray(state.attachments)) {
        state.attachments = state.attachments.map((attachment) => ({
          ...attachment,
          dynamicTilt: (attachment.dynamicTilt || 0) - direction * (8 + strain * 5)
        }));
      }
    }
  });

  class SceneScript {
    constructor(runtime) {
      this.runtime = runtime;
    }

    actor(id, actor = {}) {
      this.runtime.addActor(id, actor);
      return this;
    }

    anchor(id, target, options = {}) {
      this.runtime.addAnchor(id, target, options);
      return this;
    }

    textAnchor(id, root, text, options = {}) {
      this.runtime.addAnchor(id, textAnchor(root, text, options), options);
      return this;
    }

    point(anchor, options = {}) {
      return {
        anchor,
        ...options
      };
    }

    designPoint(x, y, options = {}) {
      return {
        x,
        y,
        space: "design",
        ...options
      };
    }

    screenPoint(x, y, options = {}) {
      return {
        x,
        y,
        space: "screen",
        ...options
      };
    }

    place(id, anchor, options = {}) {
      this.runtime.placeActor(id, this.point(anchor, options), options);
      return this;
    }

    show(id) {
      return this.runtime.showActor(id);
    }

    say(id, text, options = {}) {
      this.runtime.speak(id, text, options);
      return this.wait(options.hold ?? options.duration ?? 900);
    }

    wait(ms) {
      return delay(ms);
    }

    motion(id, name, options = {}) {
      return this.runtime.playMotion(id, name, options);
    }

    target(to, options = {}) {
      if (typeof to === "string" || isElementLike(to) || isDomRange(to)) {
        return this.point(to, options);
      }
      return to;
    }

    walk(id, to, options = {}) {
      return this.motion(id, "walk", { ...options, to: this.target(to, options) });
    }

    run(id, to, options = {}) {
      return this.motion(id, "run", { ...options, to: this.target(to, options) });
    }

    trip(id, to, options = {}) {
      return this.motion(id, "trip", { ...options, to: this.target(to, options) });
    }

    cartwheel(id, to, options = {}) {
      return this.motion(id, "cartwheel", { ...options, to: this.target(to, options) });
    }

    tiptoe(id, to, options = {}) {
      return this.motion(id, "tiptoe", { ...options, to: this.target(to, options) });
    }

    sprint(id, to, options = {}) {
      return this.motion(id, "sprint", { ...options, to: this.target(to, options) });
    }

    heave(id, to, options = {}) {
      return this.motion(id, "heave", { ...options, to: this.target(to, options) });
    }

    haul(id, to, options = {}) {
      return this.motion(id, "haul", { ...options, to: this.target(to, options) });
    }
  }

  class SceneRuntime {
    constructor(canvas, options = {}) {
      this.canvas = canvas instanceof HTMLCanvasElement ? canvas : null;
      this.ctx = this.canvas?.getContext("2d") || null;
      this.renderer = options.renderer || new CharacterRenderer(this.ctx, options.characterRenderer);
      this.dialogue = options.dialogue || new DialogueManager(this.ctx, options.dialogueOptions);
      this.actors = new Map();
      this.readerLines = new Map();
      this.animationDuration = animationDuration;
      this.actorStates = new Map();
      this.visible = false;
      this.raf = 0;
      this.startedAt = 0;
      this.lastRect = { width: 1, height: 1 };
      this.stageElement = options.stageElement || options.stage || null;
      this.regions = new Map();
      this.anchors = new Map();
      this.design = normalizeSceneDesign({
        width: options.designWidth ?? options.design?.width ?? this.canvas?.width ?? 900,
        height: options.designHeight ?? options.design?.height ?? this.canvas?.height ?? 360
      });
      this.responsiveCoordinates = options.responsiveCoordinates ?? options.responsive ?? true;
      this.safeMargin = Number(options.safeMargin) || 0;
      this.baseScale = options.baseScale || ((rect) => Math.max(5.4, Math.min(rect.width / 34, rect.height / 24)));
      this.onRenderActor = options.onRenderActor || null;
      // External scene compositors can share one clock and draw this native
      // actor surface synchronously before uploading it to their GPU pass.
      this.externalClock = options.externalClock === true;
      this.effects = new Set();
      this.anchorRetryInterval = Number(options.anchorRetryInterval ?? 1000) || 1000;
      this.anchorRetryAttempts = Math.max(0, Math.floor(Number(options.anchorRetryAttempts ?? 5) || 5));
      this.anchorRetryLog = new Map();
      this.anchorMissingLog = new Map();
      this.pixelRatioMode = normalizeScenePixelRatioMode(options.pixelRatio);
      this.maxPixelRatio = normalizeSceneMaxPixelRatio(options.maxPixelRatio);
      this.debugOverlay = options.debugOverlay ?? new URLSearchParams(window.location.search).has("sohDebug");
      this.debugState = {
        step: "",
        warnings: []
      };
      this.assertionLog = new Map();
      this.render = this.render.bind(this);
      this.resizeHandler = () => this.resize();
    }

    stageRect(canvasRect = this.canvas?.getBoundingClientRect?.() || this.lastRect) {
      const element = typeof this.stageElement === "string" ? queryTarget(this.stageElement) : this.stageElement;
      if (!element || typeof element.getBoundingClientRect !== "function") {
        return { x: 0, y: 0, width: canvasRect.width || 1, height: canvasRect.height || 1 };
      }

      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - (canvasRect.left || 0),
        y: rect.top - (canvasRect.top || 0),
        width: Math.max(1, rect.width || canvasRect.width || 1),
        height: Math.max(1, rect.height || canvasRect.height || 1)
      };
    }

    addRegion(id, target, options = {}) {
      if (!id || !target) {
        return this;
      }
      this.regions.set(String(id), {
        id: String(id),
        target,
        ...options
      });
      return this;
    }

    resolveRegionTarget(target) {
      if (typeof target === "string") {
        return queryTarget(target);
      }
      return target;
    }

    regionRect(name = "stage", canvasRect = this.canvas?.getBoundingClientRect?.() || this.lastRect) {
      const key = String(name || "stage");
      if (key === "viewport" || key === "canvas" || key === "screen") {
        return { x: 0, y: 0, width: Math.max(1, canvasRect.width || 1), height: Math.max(1, canvasRect.height || 1) };
      }
      if (key === "stage" || key === "terminalPanel" || key === "panel") {
        return this.stageRect(canvasRect);
      }

      const region = this.regions.get(key);
      if (!region) {
        this.warnOnce(`missing-region:${key}`, "[SohEngine] Animation region could not be resolved.", { region: key });
        return this.stageRect(canvasRect);
      }

      if (region.target === "viewport" || region.target === "canvas" || region.target === "screen") {
        return { x: 0, y: 0, width: Math.max(1, canvasRect.width || 1), height: Math.max(1, canvasRect.height || 1) };
      }
      if (region.target === "stage" || region.target === "terminalPanel" || region.target === "panel") {
        return this.stageRect(canvasRect);
      }
      if (region.selector) {
        const domRect = targetRect(region.selector, { runtime: this, canvasRect });
        const sceneRect = rectToSceneRect(domRect, { runtime: this, canvasRect });
        return sceneRect || this.stageRect(canvasRect);
      }
      if (region.element || isElementLike(region.target) || isDomRange(region.target)) {
        const domRect = targetRect(region.element || region.target, { runtime: this, canvasRect });
        const sceneRect = rectToSceneRect(domRect, { runtime: this, canvasRect });
        return sceneRect || this.stageRect(canvasRect);
      }
      if (Number.isFinite(Number(region.x)) && Number.isFinite(Number(region.y)) && Number.isFinite(Number(region.width)) && Number.isFinite(Number(region.height))) {
        const base = region.space === "viewport" || region.space === "screen"
          ? { x: 0, y: 0, width: canvasRect.width || 1, height: canvasRect.height || 1 }
          : this.stageRect(canvasRect);
        const projected = region.space === "design"
          ? {
              x: Number(region.x) / this.design.width * base.width,
              y: Number(region.y) / this.design.height * base.height,
              width: Number(region.width) / this.design.width * base.width,
              height: Number(region.height) / this.design.height * base.height
            }
          : {
              x: Number(region.x),
              y: Number(region.y),
              width: Number(region.width),
              height: Number(region.height)
            };
        return {
          x: base.x + projected.x,
          y: base.y + projected.y,
          width: Math.max(1, projected.width),
          height: Math.max(1, projected.height)
        };
      }

      return this.stageRect(canvasRect);
    }

    pointUsesStageCoordinates(point) {
      return Boolean(point && typeof point === "object" && !isAnchorReference(point) && point.space !== "screen" && point.space !== "viewport");
    }

    resolveRuntimePoint(point, fallback = { x: 0, y: 0 }, options = {}) {
      const canvasRect = this.canvas?.getBoundingClientRect?.() || this.lastRect;
      const stageRect = this.regionRect(point?.region || point?.stage || "stage", canvasRect);
      const actorState = options.actorState || null;
      if (this.pointUsesStageCoordinates(point)) {
        const local = resolveScenePoint(point, stageRect, {
          x: fallback.x - stageRect.x,
          y: fallback.y - stageRect.y
        }, {
          runtime: this,
          canvasRect,
          layout: sceneLayout(stageRect, this.design),
          actorState
        });
        return {
          x: local.x + stageRect.x,
          y: local.y + stageRect.y
        };
      }

      return resolveScenePoint(point, canvasRect, fallback, {
        runtime: this,
        canvasRect,
        layout: this.layoutFor(stageRect),
        actorState
      });
    }

    warnOnce(key, message, detail = {}) {
      if (!key || this.assertionLog.has(key)) {
        return;
      }
      this.assertionLog.set(key, performance.now());
      this.debugState.warnings = [
        ...(this.debugState.warnings || []).slice(-5),
        { message, detail }
      ];
      console.warn(message, detail);
    }

    addActor(id, actor = {}) {
      this.actors.set(id, {
        id,
        visible: false,
        glyph: "soh",
        bodyColor: YELLOW,
        homeX: 0.5,
        homeY: 0.5,
        enterOffsetX: 0.32,
        enterOffsetY: 0.2,
        scaleMultiplier: 1,
        shownAt: 0,
        speakingUntil: 0,
        ...actor
      });
      return this;
    }

    patchActor(id, patch = {}) {
      const actor = this.actors.get(id);
      if (actor) {
        Object.assign(actor, patch);
      }
      return actor;
    }

    addAnchor(id, target, options = {}) {
      if (!id || !target) {
        return this;
      }
      this.anchors.set(String(id), {
        id: String(id),
        target,
        protect: options.protect !== false,
        ...options
      });
      return this;
    }

    removeAnchor(id) {
      this.anchors.delete(String(id));
      return this;
    }

    clearAnchors() {
      this.anchors.clear();
      return this;
    }

    anchorTarget(idOrTarget) {
      if (typeof idOrTarget === "string" && this.anchors.has(idOrTarget)) {
        return this.anchors.get(idOrTarget).target;
      }
      return idOrTarget;
    }

    isAnchorResolvable(idOrTarget) {
      const target = this.anchorTarget(idOrTarget);
      if (!target) {
        return false;
      }
      const rect = this.canvas?.getBoundingClientRect?.() || this.lastRect;
      return Boolean(targetRect(target, { runtime: this, canvasRect: rect }));
    }

    reportMissingAnchor(idOrTarget, options = {}) {
      const label = targetLabel(idOrTarget);
      const key = `missing:${label}`;
      if (!label || this.anchorRetryLog.has(key)) {
        return;
      }

      const interval = Math.max(100, Number(options.interval ?? this.anchorRetryInterval) || this.anchorRetryInterval);
      const attempts = Math.max(0, Math.floor(Number(options.attempts ?? this.anchorRetryAttempts) || this.anchorRetryAttempts));
      const target = this.anchorTarget(idOrTarget);
      const state = {
        attempts: 0,
        timer: 0
      };
      this.anchorRetryLog.set(key, state);

      const check = () => {
        if (this.isAnchorResolvable(idOrTarget)) {
          window.clearTimeout(state.timer);
          this.anchorRetryLog.delete(key);
          return;
        }

        state.attempts += 1;
        if (state.attempts >= attempts) {
          window.clearTimeout(state.timer);
          this.anchorRetryLog.delete(key);
          this.logMissingAnchor(idOrTarget, target, attempts, interval);
          return;
        }

        state.timer = window.setTimeout(check, interval);
      };

      state.timer = window.setTimeout(check, interval);
    }

    logMissingAnchor(idOrTarget, target = this.anchorTarget(idOrTarget), attempts = this.anchorRetryAttempts, interval = this.anchorRetryInterval) {
      const label = targetLabel(idOrTarget);
      const now = Date.now();
      const lastLoggedAt = this.anchorMissingLog.get(label) || 0;
      if (now - lastLoggedAt < 5000) {
        return;
      }
      this.anchorMissingLog.set(label, now);
      console.error("[SohEngine] Animation anchor could not be resolved.", {
        anchor: label,
        target: targetLabel(target),
        attempts,
        interval
      });
    }

    async waitForAnchor(idOrTarget, options = {}) {
      if (options.signal?.aborted) return false;
      if (!idOrTarget) {
        return false;
      }
      if (this.isAnchorResolvable(idOrTarget)) {
        return true;
      }

      const interval = Math.max(100, Number(options.anchorRetryInterval ?? options.retryInterval ?? this.anchorRetryInterval) || this.anchorRetryInterval);
      const attempts = Math.max(0, Math.floor(Number(options.anchorRetryAttempts ?? options.retryAttempts ?? this.anchorRetryAttempts) || this.anchorRetryAttempts));
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        await delay(interval, { scaled: false });
        if (options.signal?.aborted) return false;
        if (this.isAnchorResolvable(idOrTarget)) {
          return true;
        }
      }

      this.logMissingAnchor(idOrTarget, this.anchorTarget(idOrTarget), attempts, interval);
      return false;
    }

    addEffect(draw, options = {}) {
      if (typeof draw !== "function") {
        return () => {};
      }
      const effect = {
        draw,
        layer: options.layer || "background",
        region: options.region || options.effectRegion || "viewport"
      };
      this.effects.add(effect);
      this.start();
      return () => this.effects.delete(effect);
    }

    drawEffects(layer, now, rect) {
      this.effects.forEach((effect) => {
        if (effect.layer !== layer) {
          return;
        }
        effect.draw(this.ctx, now, this.regionRect(effect.region, rect), this);
      });
    }

    layoutFor(rect = this.stageRect(this.canvas?.getBoundingClientRect?.() || this.lastRect)) {
      return sceneLayout(rect, this.design);
    }

    anchorPoint(target, options = {}, fallback = { x: 0, y: 0 }, actorState = null) {
      const rect = this.canvas?.getBoundingClientRect?.() || this.lastRect;
      return resolveAnchorPoint(target, rect, fallback, options, {
        runtime: this,
        canvasRect: rect,
        layout: this.layoutFor(rect),
        actorState
      });
    }

    anchorRect(target) {
      const rect = this.canvas?.getBoundingClientRect?.() || this.lastRect;
      const result = rectToSceneRect(targetRect(target, { runtime: this, canvasRect: rect }), { runtime: this, canvasRect: rect });
      if (!result) {
        this.reportMissingAnchor(target);
      }
      return result;
    }

    protectedAnchorRects() {
      const rect = this.canvas?.getBoundingClientRect?.() || this.lastRect;
      return [...this.anchors.values()]
        .filter((anchor) => anchor.protect !== false)
        .map((anchor) => rectToSceneRect(targetRect(anchor.target, { runtime: this, canvasRect: rect, anchor }), { runtime: this, canvasRect: rect }))
        .filter(Boolean);
    }

    setDebugStep(label, step = null) {
      this.debugState.step = label || "";
      this.debugState.stepData = step || null;
    }

    placeActor(id, target, options = {}) {
      const actor = this.actors.get(id);
      if (!actor || !this.canvas) {
        return null;
      }
      const rect = this.canvas.getBoundingClientRect();
      const stageRect = this.stageRect(rect);
      const actorState = this.currentActorState(id) || {
        x: stageRect.x + stageRect.width * (actor.homeX || 0.5),
        y: stageRect.y + stageRect.height * (actor.homeY || 0.5),
        scale: this.baseScale(stageRect) * (actor.scaleMultiplier || 1)
      };
      const targetForPoint = target && typeof target === "object" && !isAnchorReference(target) && options.region && !target.region
        ? { ...target, region: options.region }
        : target;
      const point = this.resolveRuntimePoint(targetForPoint, actorState, {
        actorState
      });
      const requestedTarget = typeof target === "string" ? target : target?.anchor ?? target?.element ?? target?.range ?? target?.to ?? null;
      if (requestedTarget && !this.isAnchorResolvable(requestedTarget)) {
        this.reportMissingAnchor(requestedTarget);
      }
      actor.homeX = (point.x - stageRect.x) / Math.max(1, stageRect.width);
      actor.homeY = (point.y - stageRect.y) / Math.max(1, stageRect.height);
      actor.enterOffsetX = options.enterOffsetX || 0;
      actor.enterOffsetY = options.enterOffsetY || 0;
      actor.offsetX = 0;
      actor.offsetY = 0;
      if (options.show !== false) {
        actor.visible = true;
        actor.shownAt ||= performance.now();
        this.start();
      }
      return point;
    }

    showActor(id) {
      const actor = this.actors.get(id);
      if (!actor) {
        return Promise.resolve();
      }

      actor.visible = true;
      actor.shownAt ||= performance.now();
      this.start();
      return Promise.resolve();
    }

    hideActor(id) {
      this.cancelActorMotion(id);
      const actor = this.actors.get(id);
      if (actor) {
        actor.visible = false;
        actor.motion = null;
        this.quiet(id);
      }
      return Promise.resolve();
    }

    speak(id, text, options = {}) {
      this.readerLines.get(id)?.cancel();
      const actor = this.actors.get(id);
      if (!actor) {
        return;
      }

      const now = performance.now();
      actor.visible = true;
      actor.shownAt ||= now;
      const rawDuration = Math.max(0, Number(options.duration || 900) || 0);
      const duration = options.scaled === false || options.durationScaled === false
        ? rawDuration
        : animationDuration(rawDuration);
      actor.speakingUntil = Math.max(actor.speakingUntil || 0, now + duration);
      actor.spokenAt = now;
      this.dialogue.say(id, text, {
        color: options.color || actor.dialogueColor || actor.bodyColor,
        textColor: options.textColor || actor.dialogueTextColor || options.color || actor.bodyColor,
        priority: options.priority ?? actor.dialoguePriority ?? 1,
        maxChars: options.maxChars || actor.dialogueMaxChars || (actor.crown ? 20 : 18),
        duration,
        side: options.side,
        anchorOffset: options.anchorOffset || options.bubbleAnchorOffset || options.speechBubbleAnchorOffset,
        anchorOffsetX: options.anchorOffsetX ?? options.bubbleAnchorOffsetX,
        anchorOffsetY: options.anchorOffsetY ?? options.bubbleAnchorOffsetY,
        avoidProtectedRects: options.avoidProtectedRects,
        continuePrompt: options.continuePrompt,
        continuePromptText: options.continuePromptText,
        continuePromptColor: options.continuePromptColor,
        style: options.style,
        bubbleStyle: options.bubbleStyle,
        tailStyle: options.tailStyle,
        type: options.type,
        small: options.small,
        textScale: options.textScale
      });
      this.start();
    }

    // Shared reader gate for cutscenes and leased page activities. Its clock is
    // account reading speed, never animation speed; cancellation owns cleanup.
    readerLine(id, text, options = {}) {
      if (!this.actors.has(id) || options.signal?.aborted) return Promise.resolve(false);
      this.readerLines.get(id)?.cancel();
      const requiresContinue = shouldRequireDialogueContinue(options);
      const duration = dialogueDwellDuration(text, { duration: 2200, ...options });
      return new Promise((resolve) => {
        let done = false;
        let timer;
        const signal = options.signal;
        const finish = (completed) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
          if (this.readerLines.get(id) === line) {
            this.readerLines.delete(id);
            if (!completed || options.clear !== false) this.quiet(id);
          }
          resolve(completed);
        };
        const abort = () => finish(false);
        const line = { cancel: abort };
        if (requiresContinue) {
          const continued = this.waitForDialogueContinue(id, text, {
            ...options, duration: options.continueDuration || 86400000, durationScaled: false
          });
          continued.then(() => finish(true));
        } else {
          this.speak(id, text, { ...options, duration, durationScaled: false });
          timer = window.setTimeout(() => finish(true), duration);
        }
        this.readerLines.set(id, line);
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) abort();
      });
    }

    waitForDialogueContinue(id, text, options = {}) {
      this.readerLines.get(id)?.cancel();
      const actor = this.actors.get(id);
      if (!actor) {
        return Promise.resolve();
      }

      const now = performance.now();
      actor.visible = true;
      actor.shownAt ||= now;
      actor.speakingUntil = Math.max(actor.speakingUntil || 0, now + Number(options.duration || 86400000));
      actor.spokenAt = now;
      this.start();
      return this.dialogue.waitForContinue(id, text, {
        color: options.color || actor.dialogueColor || actor.bodyColor,
        textColor: options.textColor || actor.dialogueTextColor || options.color || actor.bodyColor,
        priority: options.priority ?? actor.dialoguePriority ?? 1,
        maxChars: options.maxChars || actor.dialogueMaxChars || (actor.crown ? 20 : 18),
        duration: Number(options.duration || 86400000),
        side: options.side,
        anchorOffset: options.anchorOffset || options.bubbleAnchorOffset || options.speechBubbleAnchorOffset,
        anchorOffsetX: options.anchorOffsetX ?? options.bubbleAnchorOffsetX,
        anchorOffsetY: options.anchorOffsetY ?? options.bubbleAnchorOffsetY,
        avoidProtectedRects: options.avoidProtectedRects,
        continuePromptText: options.continuePromptText,
        continuePromptColor: options.continuePromptColor,
        style: options.style,
        bubbleStyle: options.bubbleStyle,
        tailStyle: options.tailStyle,
        type: options.type,
        small: options.small,
        textScale: options.textScale
      });
    }

    quiet(id) {
      this.readerLines.get(id)?.cancel();
      const actor = this.actors.get(id);
      if (actor) {
        actor.speakingUntil = performance.now();
      }
      this.dialogue.clearSpeaker(id);
    }

    removeActor(id) {
      // Live scenes reconcile population without restarting the shared runtime.
      // Settle outstanding speech/motion promises before releasing this identity.
      this.cancelActorMotion(id);
      this.quiet(id);
      this.readerLines.delete(id);
      this.actorStates.delete(id);
      return this.actors.delete(id);
    }

    gesture(id, type, duration = 640) {
      const actor = this.actors.get(id);
      if (!actor) {
        return;
      }

      const until = performance.now() + animationDuration(duration);
      if (type === "touch") {
        actor.touchUntil = until;
      } else if (type === "poke") {
        actor.pokeUntil = until;
      } else if (type === "command") {
        actor.commandUntil = until;
      }
      this.start();
    }

    pointActorAt(id, target, options = {}) {
      const actor = this.actors.get(id);
      const state = this.currentActorState(id);
      const rect = this.anchorRect(target);
      if (!actor || !state || !rect || !Number.isFinite(state.scale) || state.scale <= 0) {
        return false;
      }

      const point = anchorPointFromRect(rect, { at: options.at || "center" });
      const slot = options.slot || (point.x < state.x + state.scale * 5 ? "leftHand" : "rightHand");
      actor.reachTarget = {
        slot,
        x: (point.x - state.x) / state.scale,
        y: (point.y - state.y) / state.scale,
        weight: 1
      };
      actor.reachTargetUntil = performance.now() + animationDuration(Number(options.duration) || 1800);
      this.start();
      return true;
    }

    clearActorPoint(id) {
      const actor = this.actors.get(id);
      if (!actor) return false;
      actor.reachTarget = null;
      actor.reachTargetUntil = 0;
      this.start();
      return true;
    }

    currentActorState(id) {
      const actor = this.actors.get(id);
      if (!actor || !this.canvas) {
        return null;
      }

      const rect = this.canvas.getBoundingClientRect();
      return this.stateForActor(actor, [...this.actors.keys()].indexOf(id), performance.now(), rect, this.stageRect(rect));
    }

    cancelActorMotion(id) {
      const actor = this.actors.get(id);
      if (!actor?.motion) return;
      const state = this.currentActorState(id);
      const stage = this.stageRect();
      const motion = actor.motion;
      actor.motion = null;
      actor.enterOffsetX = actor.enterOffsetY = actor.offsetX = actor.offsetY = 0;
      actor.rotation = actor.skewX = 0;
      actor.touchUntil = actor.pokeUntil = actor.commandUntil = 0;
      if (state) {
        actor.scaleMultiplier = state.scale / this.baseScale(stage);
        // Remove the settled pose's bob/gesture contribution from the new home
        // coordinates so it is not added a second time at the handoff.
        const settled = this.currentActorState(id);
        actor.homeX += (state.x - settled.x) / stage.width;
        actor.homeY += (state.y - settled.y) / stage.height;
      }
      this.actorStates.delete(id);
      motion.finish?.(false);
    }

    playMotion(id, name, options = {}) {
      const actor = this.actors.get(id);
      const motion = getMotion(name);
      if (!actor || !motion || options.signal?.aborted) {
        return Promise.resolve(false);
      }

      return (async () => {
        if (isAnchorReference(options.from)) {
          await this.waitForAnchor(options.from, options);
        }
        if (isAnchorReference(options.to)) {
          await this.waitForAnchor(options.to, options);
        }
        if (options.signal?.aborted || this.actors.get(id) !== actor) return false;
        this.cancelActorMotion(id);

        const now = performance.now();
        const rect = this.canvas?.getBoundingClientRect?.() || this.lastRect;
        const stageRect = this.stageRect(rect);
        const current = this.currentActorState(id) || {
          x: stageRect.x + stageRect.width * (actor.homeX || 0.5),
          y: stageRect.y + stageRect.height * (actor.homeY || 0.5),
          scale: this.baseScale(stageRect) * (actor.scaleMultiplier || 1)
        };
        const fromTarget = options.from && typeof options.from === "object" && !isAnchorReference(options.from) && options.region && !options.from.region
          ? { ...options.from, region: options.region }
          : options.from;
        const toTarget = options.to && typeof options.to === "object" && !isAnchorReference(options.to) && options.region && !options.to.region
          ? { ...options.to, region: options.region }
          : options.to;
        const from = this.resolveRuntimePoint(fromTarget, { x: current.x, y: current.y }, { actorState: current });
        const duration = animationDuration(Number(options.duration || motion.duration || 1000));
        const fromScale = current.scale;
        const nextScaleMultiplier = Number(options.scaleMultiplier);
        const toScale = Number.isFinite(nextScaleMultiplier)
          ? this.baseScale(stageRect) * nextScaleMultiplier
          : fromScale;
        const to = this.resolveRuntimePoint(toTarget, { x: current.x, y: current.y }, { actorState: { ...current, scale: toScale } });
        const motionInstance = {
          id: `${name}-${now}`,
          name,
          startedAt: now,
          duration,
          from,
          to,
          fromScale,
          toScale,
          options
        };

        actor.visible = true;
        actor.shownAt ||= now;
        actor.motion = motionInstance;
        actor.restTarget = null;
        this.start();

        return new Promise((resolve) => {
          const signal = options.signal;
          const abort = () => { if (actor.motion === motionInstance) this.cancelActorMotion(id); };
          const timer = window.setTimeout(() => {
            if (actor.motion !== motionInstance) { motionInstance.finish(false); return; }
            actor.motion = null;
            // Resolve DOM anchors again: scrolling/resizing may have moved the
            // destination since the motion began.
            const finalStage = this.stageRect();
            const finalScale = Number.isFinite(nextScaleMultiplier) ? this.baseScale(finalStage) * nextScaleMultiplier : toScale;
            const finalPoint = this.resolveRuntimePoint(toTarget, to, { actorState: { ...current, scale: finalScale } });
            actor.homeX = (finalPoint.x - finalStage.x) / finalStage.width;
            actor.homeY = (finalPoint.y - finalStage.y) / finalStage.height;
            actor.enterOffsetX = actor.enterOffsetY = actor.offsetX = actor.offsetY = 0;
            actor.rotation = actor.skewX = 0;
            if (Number.isFinite(nextScaleMultiplier)) actor.scaleMultiplier = nextScaleMultiplier;
            this.actorStates.delete(id);
            motionInstance.finish(true);
          }, duration);
          motionInstance.finish = (completed) => {
            window.clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            resolve(completed);
          };
          signal?.addEventListener("abort", abort, { once: true });
          if (signal?.aborted) abort();
        });
      })();
    }

    script() {
      return new SceneScript(this);
    }

    resize(measuredRect) {
      if (!this.canvas || !this.ctx) {
        return;
      }

      const rect = measuredRect?.width !== undefined ? measuredRect : this.canvas.getBoundingClientRect();
      this.lastRect = { width: rect.width, height: rect.height };
      const dpr = resolveScenePixelRatio(
        window.devicePixelRatio,
        this.pixelRatioMode,
        this.maxPixelRatio
      );
      this.renderPixelRatio = dpr;
      this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.renderer.setContext(this.ctx);
      this.dialogue.setContext(this.ctx).setBounds(rect.width, rect.height);
    }

    start() {
      if (!this.canvas || !this.ctx || this.visible) {
        return;
      }

      this.visible = true;
      this.startedAt ||= performance.now();
      this.canvas.hidden = false;
      this.resize();
      window.addEventListener("resize", this.resizeHandler, { passive: true });
      if (!this.externalClock) this.raf = window.requestAnimationFrame(this.render);
    }

    stop() {
      [...this.readerLines.values()].forEach((line) => line.cancel());
      [...this.actors.keys()].forEach((id) => this.cancelActorMotion(id));
      this.visible = false;
      this.dialogue.clearAll();
      this.audioSession?.stop?.({ fadeOut: 120 });
      window.cancelAnimationFrame(this.raf);
      window.removeEventListener("resize", this.resizeHandler);
    }

    stateForActor(actor, index, now, rect, stageRect = this.stageRect(rect)) {
      const scaleBase = this.baseScale(stageRect);
      const enter = actor.shownAt ? easeInOut(clamp((now - actor.shownAt) / (actor.enterDuration || 520), 0, 1)) : 0;
      const speaking = now < (actor.speakingUntil || 0);
      const touchLean = now < (actor.touchUntil || 0) ? Math.sin((1 - clamp((actor.touchUntil - now) / 640, 0, 1)) * Math.PI) : 0;
      const pokeLean = now < (actor.pokeUntil || 0) ? Math.sin((1 - clamp((actor.pokeUntil - now) / 640, 0, 1)) * Math.PI) : 0;
      const command = now < (actor.commandUntil || 0);
      const bob = Math.sin(now / (actor.crown ? 620 : 480) + index) * (actor.idleBob === false ? 0 : actor.crown ? 1.2 : 2.1);
      const scale = scaleBase * (actor.scaleMultiplier || 1);
      const state = {
        ...actor,
        x: stageRect.x + stageRect.width * (actor.homeX + (1 - enter) * (actor.enterOffsetX || 0)) + (command ? -28 : 0) + touchLean * 16 - pokeLean * 30 + (actor.offsetX || 0),
        y: stageRect.y + stageRect.height * (actor.homeY + (1 - enter) * (actor.enterOffsetY || 0)) + bob + (actor.offsetY || 0),
        scale,
        rotation: (1 - enter) * (actor.enterRotation || 0) + (speaking ? Math.sin(now / 140) * 0.018 : 0) + touchLean * 0.08 - pokeLean * 0.1 + (actor.rotation || 0),
        skewX: speaking ? Math.sin(now / 180) * 0.04 : actor.skewX || 0,
        speakingUntil: actor.speakingUntil || 0,
        touchUntil: actor.touchUntil || 0,
        pokeUntil: actor.pokeUntil || 0,
        reachTarget: actor.reachTargetUntil === undefined || now < actor.reachTargetUntil ? actor.reachTarget : null
      };

      if (!actor.motion && actor.restTarget) {
        const target = this.resolveRuntimePoint(actor.restTarget, state, { actorState: state });
        state.x = target.x;
        state.y = target.y;
      }

      if (actor.motion) {
        const motion = getMotion(actor.motion.name);
        if (motion) {
          const elapsed = now - actor.motion.startedAt;
          const progress = clamp(elapsed / actor.motion.duration, 0, 1);
          state.scale = lerp(actor.motion.fromScale, actor.motion.toScale, easeInOut(progress));
          motion.apply(state, {
            actor,
            motion: actor.motion,
            runtime: this,
            rect,
            now,
            elapsed,
            progress,
            from: actor.motion.from,
            to: actor.motion.to,
            fromScale: actor.motion.fromScale,
            toScale: actor.motion.toScale,
            options: actor.motion.options || {},
            mouths: mouthFrames
          });
        }
      }

      return this.onRenderActor ? this.onRenderActor(state, actor, now, rect) || state : state;
    }

    render(now) {
      if (!this.visible || !this.canvas || !this.ctx) {
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      // Live fragments and hidden panels can mount before layout. A zero-sized
      // surface has no drawable bounds; keep the loop alive for its first layout.
      if (rect.width <= 0 || rect.height <= 0) {
        if (!this.externalClock) this.raf = window.requestAnimationFrame(this.render);
        return;
      }
      // DOM content can resize a stage without a window resize (for example,
      // adding a comment). Keep CSS coordinates and backing pixels in step
      // before drawing, so the browser never stretches yesterday's surface.
      const dpr = resolveScenePixelRatio(window.devicePixelRatio, this.pixelRatioMode, this.maxPixelRatio);
      if (this.canvas.width !== Math.max(1, Math.floor(rect.width * dpr)) ||
          this.canvas.height !== Math.max(1, Math.floor(rect.height * dpr)) ||
          this.renderPixelRatio !== dpr) {
        this.resize(rect);
      }
      const stageRect = this.stageRect(rect);
      this.lastRect = { width: rect.width, height: rect.height };
      this.ctx.clearRect(0, 0, rect.width, rect.height);
      this.drawEffects("background", now, rect);
      this.actorStates.clear();
      [...this.actors.values()].forEach((actor, index) => {
        if (!actor.visible) {
          return;
        }

        const state = this.stateForActor(actor, index, now, rect, stageRect);
        this.actorStates.set(actor.id, state);
      });
      [...this.actorStates.values()]
        .sort((a, b) => (a.layer || 0) - (b.layer || 0) || a.y - b.y)
        .forEach((state) => this.renderer.draw(state, now));
      this.dialogue.draw(this.actorStates, now, [
        ...(this.protectedRects || []),
        ...this.protectedAnchorRects()
      ]);
      this.runVisualAssertions(rect, stageRect, now);
      this.drawEffects("foreground", now, rect);
      this.drawDebugOverlay(now, rect, stageRect);
      if (!this.externalClock) this.raf = window.requestAnimationFrame(this.render);
    }

    runVisualAssertions(rect, stageRect, now) {
      [...this.actorStates.values()].forEach((state) => {
        const width = SOURCE_WIDTH * state.scale;
        const height = SOURCE_HEIGHT * state.scale;
        const x = state.x - width / 2;
        const y = state.y - height / 2;
        const visibleWidth = Math.max(0, Math.min(rect.width, x + width) - Math.max(0, x));
        const visibleHeight = Math.max(0, Math.min(rect.height, y + height) - Math.max(0, y));
        const visibleRatio = (visibleWidth * visibleHeight) / Math.max(1, width * height);
        if (visibleRatio < 0.35 && !state.allowOffscreen) {
          this.warnOnce(`actor-mostly-offscreen:${state.id}`, "[SohEngine] Actor is mostly outside the canvas.", {
            actor: state.id,
            visibleRatio: Math.round(visibleRatio * 100) / 100
          });
        }
        if (state.scale > this.baseScale(stageRect) * 4) {
          this.warnOnce(`actor-large:${state.id}`, "[SohEngine] Actor scale is unusually large for the stage.", {
            actor: state.id,
            scale: Math.round(state.scale * 100) / 100
          });
        }
      });

      this.dialogue.activeBubbles(now).forEach((bubble) => {
        const offscreen = bubble.x + bubble.width < 0 ||
          bubble.y + bubble.height < 0 ||
          bubble.x > rect.width ||
          bubble.y > rect.height;
        if (offscreen) {
          this.warnOnce(`bubble-offscreen:${bubble.id}`, "[SohEngine] Dialogue bubble is outside the canvas.", {
            bubble: bubble.id,
            speaker: bubble.speakerId
          });
        }
      });
    }

    drawDebugOverlay(now, rect, stageRect) {
      if (!this.debugOverlay || !this.ctx) {
        return;
      }
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.font = "11px monospace";
      ctx.textBaseline = "top";
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#00ffff";
      ctx.strokeRect(stageRect.x + 0.5, stageRect.y + 0.5, stageRect.width - 1, stageRect.height - 1);
      ctx.fillStyle = "#00ffff";
      ctx.fillText(`stage ${Math.round(stageRect.width)}x${Math.round(stageRect.height)}`, stageRect.x + 6, stageRect.y + 6);
      [...this.actorStates.values()].forEach((state) => {
        const width = SOURCE_WIDTH * state.scale;
        const height = SOURCE_HEIGHT * state.scale;
        const x = state.x - width / 2;
        const y = state.y - height / 2;
        ctx.strokeStyle = state.crown ? "#be7dff" : "#ffff55";
        ctx.strokeRect(x + 0.5, y + 0.5, width, height);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(state.id || "actor", x, y - 13);
      });
      [...this.anchors.values()].forEach((anchor) => {
        const box = rectToSceneRect(targetRect(anchor.target, { runtime: this, canvasRect: rect, anchor }), { runtime: this, canvasRect: rect });
        if (!box) {
          return;
        }
        ctx.strokeStyle = "#00ff66";
        ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);
        ctx.fillStyle = "#00ff66";
        ctx.fillText(anchor.id, box.x, box.y - 12);
      });
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`step: ${this.debugState.step || "none"}`, 12, 12);
      (this.debugState.warnings || []).slice(-3).forEach((warning, index) => {
        ctx.fillStyle = "#ff5555";
        ctx.fillText(String(warning.message || warning).slice(0, 110), 12, 28 + index * 14);
      });
      ctx.restore();
    }
  }

  const cutsceneAssetRegistry = new Map();
  const cutsceneActionRegistry = new Map();

  function normalizeCutsceneTimeline(timeline) {
    if (!timeline) {
      return [];
    }
    return Array.isArray(timeline) ? timeline : [timeline];
  }

  function interpolateCutsceneValue(value, context = {}) {
    if (typeof value === "string") {
      return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
        const replacement = context[key];
        return replacement === undefined || replacement === null ? "" : String(replacement);
      });
    }
    if (Array.isArray(value)) {
      return value.map((item) => interpolateCutsceneValue(item, context));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateCutsceneValue(item, context)]));
    }
    return value;
  }

  class CutsceneDirector {
    constructor(runtime, options = {}) {
      this.runtime = runtime;
      this.asset = null;
      this.context = options.context || {};
      this.reducedMotion = Boolean(options.reducedMotion);
      this.cancelled = false;
      this.events = new EventTarget();
      this.audio = options.audio || null;
      this.actionHandlers = new Map(cutsceneActionRegistry);
      if (options.actions && typeof options.actions === "object") {
        Object.entries(options.actions).forEach(([name, handler]) => {
          if (typeof handler === "function") {
            this.actionHandlers.set(name, handler);
          }
        });
      }
    }

    load(asset) {
      this.asset = asset || null;
      this.cancelled = false;
      if (!this.asset || !this.runtime) {
        return this;
      }

      if (window.ShedAudio?.manager) {
        if (!this.audio) {
          this.audio = window.ShedAudio.manager.scene(this.asset.id || "cutscene", {
            assets: this.asset.audio || {}
          });
        } else if (typeof this.audio.define === "function") {
          this.audio.define(this.asset.audio || {});
        }
        this.runtime.audioSession = this.audio;
      }

      const stage = this.asset.stage || {};
      if (stage.design || stage.designWidth || stage.designHeight) {
        this.runtime.design = normalizeSceneDesign(stage.design || stage);
      }
      if (stage.responsive !== undefined || stage.responsiveCoordinates !== undefined) {
        this.runtime.responsiveCoordinates = stage.responsiveCoordinates ?? stage.responsive;
      }
      Object.entries(stage.regions || {}).forEach(([id, region]) => {
        this.runtime.addRegion(id, region.target || region.selector || region.element || region, region);
      });

      Object.entries(this.asset.actors || {}).forEach(([id, actor]) => {
        this.runtime.addActor(id, this.resolveActorDefinition(actor));
      });
      Object.entries(this.asset.anchors || {}).forEach(([id, anchor]) => {
        this.runtime.addAnchor(id, this.resolveAnchorDefinition(anchor), anchor.options || anchor);
      });
      return this;
    }

    resolveActorDefinition(actor = {}) {
      const definition = { ...actor };
      delete definition.character;
      if (actor.character === "Soh") {
        definition.glyph ??= "soh";
        definition.bodyColor ??= YELLOW;
      } else if (actor.character === "Stx") {
        definition.glyph ??= "stx";
        definition.bodyColor ??= vgaColor(0x3a);
        definition.dialogueTextColor ??= vgaColor(0x0f);
        definition.crown ??= true;
        definition.crownColor ??= vgaColor(0x2b);
      }
      return definition;
    }

    resolveAnchorDefinition(anchor) {
      if (!anchor || typeof anchor !== "object") {
        return anchor;
      }
      if (anchor.selector) {
        return anchor.selector;
      }
      if (anchor.text) {
        return textAnchor(anchor.root || document.body, anchor.text, anchor);
      }
      if (anchor.element || anchor.range || anchor.anchor) {
        return anchor.element || anchor.range || anchor.anchor;
      }
      return anchor;
    }

    validate(asset = this.asset) {
      const errors = [];
      if (!asset || typeof asset !== "object") {
        errors.push("Cutscene asset is missing.");
        return errors;
      }

      const actorIds = new Set(Object.keys(asset.actors || {}));
      const anchorIds = new Set(Object.keys(asset.anchors || {}));
      const regionIds = new Set([
        "viewport",
        "canvas",
        "screen",
        "stage",
        "terminalPanel",
        "panel",
        ...Object.keys(asset.stage?.regions || {})
      ]);
      const audio = asset.audio || {};
      const audioKinds = {
        music: new Set(Object.keys(audio.music || {})),
        ambience: new Set(Object.keys(audio.ambience || {})),
        sfx: new Set(Object.keys(audio.sfx || {})),
        ui: new Set(Object.keys(audio.ui || {})),
        voice: new Set(Object.keys(audio.voice || {})),
        assets: new Set(Object.keys(audio.assets || {}))
      };
      const allAudioIds = new Set([
        ...audioKinds.music,
        ...audioKinds.ambience,
        ...audioKinds.sfx,
        ...audioKinds.ui,
        ...audioKinds.voice,
        ...audioKinds.assets
      ]);
      const audioExtensions = /\.(mp3|ogg|wav|m4a|aac|flac|webm)(?:[?#].*)?$/i;
      const inspectAudioMap = (kind, fallbackBus) => {
        Object.entries(audio[kind] || {}).forEach(([id, definition]) => {
          if (!definition?.src && !definition?.url) {
            errors.push(`audio.${kind}.${id}: missing src.`);
          } else if (!audioExtensions.test(String(definition.src || definition.url))) {
            errors.push(`audio.${kind}.${id}: unsupported audio extension.`);
          }
          const bus = definition?.bus || fallbackBus;
          if (bus && !["master", "music", "ambience", "sfx", "ui", "voice"].includes(bus)) {
            errors.push(`audio.${kind}.${id}: unknown bus "${bus}".`);
          }
        });
      };
      inspectAudioMap("music", "music");
      inspectAudioMap("ambience", "ambience");
      inspectAudioMap("sfx", "sfx");
      inspectAudioMap("ui", "ui");
      inspectAudioMap("voice", "voice");
      inspectAudioMap("assets", "sfx");
      const inspectAudioReference = (id, path, expectedKind = null) => {
        if (!id || String(id).includes("{{")) {
          return;
        }
        if (!allAudioIds.has(String(id))) {
          errors.push(`${path}: unknown audio "${id}".`);
          return;
        }
        if (expectedKind && !audioKinds[expectedKind]?.has(String(id)) && !audioKinds.assets.has(String(id))) {
          errors.push(`${path}: audio "${id}" is not declared as ${expectedKind}.`);
        }
      };
      const inspectSceneAudio = (config, path) => {
        if (!config || typeof config !== "object") {
          return;
        }
        inspectAudioReference(config.music, `${path}.music`, "music");
        inspectAudioReference(config.ambience, `${path}.ambience`, "ambience");
        inspectAudioReference(config.sound || config.sfx, `${path}.sound`);
      };
      inspectSceneAudio(asset.sceneAudio || audio.scene, "sceneAudio");
      const inspectStep = (step, path) => {
        if (!step || typeof step !== "object") {
          return;
        }
        if (Array.isArray(step)) {
          step.forEach((item, index) => inspectStep(item, `${path}[${index}]`));
          return;
        }
        if (step.sequence) {
          normalizeCutsceneTimeline(step.sequence).forEach((item, index) => inspectStep(item, `${path}.sequence[${index}]`));
        }
        if (step.parallel) {
          normalizeCutsceneTimeline(step.parallel).forEach((item, index) => inspectStep(item, `${path}.parallel[${index}]`));
        }
        if (step.actor && !String(step.actor).includes("{{") && !actorIds.has(step.actor)) {
          errors.push(`${path}: unknown actor "${step.actor}".`);
        }
        normalizeCutsceneTimeline(step.lines || []).forEach((line, index) => inspectStep(line, `${path}.lines[${index}]`));
        const target = step.to || step.from || step.target;
        if (typeof target === "string" && !actorIds.has(target) && !anchorIds.has(target) && !getMotion(target)) {
          // Strings can also be selectors, so only warn on known-looking ids.
          if (/^[\w.-]+$/.test(target)) {
            errors.push(`${path}: unknown target "${target}".`);
          }
        }
        if (step.do === "motion" && step.name && !getMotion(step.name)) {
          errors.push(`${path}: unknown motion "${step.name}".`);
        }
        const region = step.region || step.effectRegion || step.actorRegion;
        if (region && !String(region).includes("{{") && !regionIds.has(String(region))) {
          errors.push(`${path}: unknown region "${region}".`);
        }
        if (step.do === "music" || step.do === "playMusic") {
          inspectAudioReference(step.id || step.name || step.music, path, "music");
        }
        if (step.do === "ambience" || step.do === "playAmbience") {
          inspectAudioReference(step.id || step.name || step.ambience, path, "ambience");
        }
        if (step.do === "sound" || step.do === "sfx" || step.do === "playSound") {
          inspectAudioReference(step.id || step.name || step.sound || step.sfx, path);
        }
        inspectSceneAudio(step.sceneAudio || step.audio, `${path}.audio`);
      };

      normalizeCutsceneTimeline(asset.timeline).forEach((step, index) => inspectStep(step, `timeline[${index}]`));
      Object.entries(asset.cues || {}).forEach(([id, timeline]) => {
        inspectSceneAudio(timeline.sceneAudio || timeline.audio, `cues.${id}.audio`);
        normalizeCutsceneTimeline(timeline.timeline || timeline.sequence || timeline).forEach((step, index) => inspectStep(step, `cues.${id}[${index}]`));
      });
      return errors;
    }

    on(type, handler) {
      this.events.addEventListener(type, handler);
      return () => this.events.removeEventListener(type, handler);
    }

    emit(type, detail = {}) {
      this.events.dispatchEvent(new CustomEvent(type, { detail }));
    }

    cancel() {
      this.cancelled = true;
      this.audio?.stop?.({ fadeOut: 120 });
      this.emit("cancel");
    }

    async play(asset = this.asset, context = {}) {
      if (asset && asset !== this.asset) {
        this.load(asset);
      }
      await this.playAudioConfig(this.asset?.sceneAudio || this.asset?.audio?.scene, context);
      return this.playTimeline(this.asset?.timeline || [], context);
    }

    async playCue(id, context = {}) {
      const cue = this.asset?.cues?.[id];
      if (!cue) {
        return false;
      }
      const timeline = cue.timeline || cue.sequence || cue;
      await this.playAudioConfig(cue.sceneAudio || cue.audio, { cue: id, cueTitle: cue.title || cue.label || id, ...context });
      await this.playTimeline(timeline, { cue: id, cueTitle: cue.title || cue.label || id, ...context });
      return true;
    }

    async playAudioConfig(config, context = {}) {
      if (!config || !this.audio) {
        return;
      }
      const resolved = interpolateCutsceneValue(config, { ...this.context, ...context });
      if (resolved.music) {
        await this.audio.music(resolved.music, resolved);
      }
      if (resolved.ambience) {
        await this.audio.ambience(resolved.ambience, resolved);
      }
      if (resolved.sound || resolved.sfx) {
        this.audio.sound(resolved.sound || resolved.sfx, resolved);
      }
    }

    async playTimeline(timeline, context = {}) {
      for (const step of normalizeCutsceneTimeline(timeline)) {
        if (this.cancelled) {
          return false;
        }
        await this.playStep(step, context);
      }
      return true;
    }

    async playStep(step, context = {}) {
      if (!step) {
        return;
      }
      if (Array.isArray(step)) {
        await this.playTimeline(step, context);
        return;
      }

      const resolved = interpolateCutsceneValue(step, { ...this.context, ...context });
      const label = resolved.label || resolved.do || resolved.name || "step";
      this.runtime?.setDebugStep?.(label, resolved);
      this.emit("step:start", { step: resolved, label, context });
      if (resolved.sequence) {
        await this.playTimeline(resolved.sequence, context);
      } else if (resolved.parallel) {
        await Promise.all(normalizeCutsceneTimeline(resolved.parallel).map((item) => this.playStep(item, context)));
      } else if (resolved.repeat) {
        const count = Math.max(0, Math.floor(Number(resolved.repeat.count) || 0));
        for (let index = 0; index < count; index += 1) {
          await this.playTimeline(resolved.repeat.timeline || resolved.repeat.do || [], { ...context, index });
        }
      } else {
        await this.performAction(resolved, context);
      }
      if ((resolved.waitAfter || resolved.delayAfter) && !this.reducedMotion) {
        await delay(Number(resolved.waitAfter ?? resolved.delayAfter) || 0);
      }
      this.emit("step:end", { step: resolved, label, context });
    }

    async performAction(step, context = {}) {
      const action = step.do || step.action || step.type;
      const actor = step.actor || step.id;
      if (!action) {
        return;
      }

      if (this.actionHandlers.has(action)) {
        await this.actionHandlers.get(action)({ director: this, runtime: this.runtime, step, context, asset: this.asset });
        return;
      }

      if (action === "wait") {
        if (!this.reducedMotion) {
          await delay(Number(step.ms ?? step.duration) || 0);
        }
        return;
      }
      if (action === "music" || action === "playMusic") {
        await this.audio?.music?.(step.id || step.name || step.music, step);
        return;
      }
      if (action === "musicStop" || action === "stopMusic") {
        await this.audio?.stopMusic?.(step);
        return;
      }
      if (action === "ambience" || action === "playAmbience") {
        await this.audio?.ambience?.(step.id || step.name || step.ambience, step);
        return;
      }
      if (action === "ambienceStop" || action === "stopAmbience") {
        await this.audio?.stopAmbience?.(step);
        return;
      }
      if (action === "sound" || action === "sfx" || action === "playSound") {
        this.audio?.sound?.(step.id || step.name || step.sound || step.sfx, step);
        return;
      }
      if (action === "audioStop" || action === "stopAudio") {
        await this.audio?.stop?.(step);
        return;
      }
      if (action === "show") {
        await this.runtime.showActor(actor);
        return;
      }
      if (action === "hide") {
        await this.runtime.hideActor(actor);
        return;
      }
      if (action === "line") {
        await this.playLine(step, actor);
        return;
      }
      if (action === "conversation") {
        await this.playConversation(step);
        return;
      }
      if (action === "say" || action === "speak") {
        this.runtime.speak(actor, step.text || "", step);
        if (step.hold && !this.reducedMotion) {
          await delay(Number(step.hold) || 0);
        }
        return;
      }
      if (action === "quiet") {
        this.runtime.quiet(actor);
        return;
      }
      if (action === "gesture") {
        this.runtime.gesture(actor, step.gesture || step.name, Number(step.duration) || undefined);
        return;
      }
      if (action === "touch" || action === "poke" || action === "command") {
        this.runtime.gesture(actor, action, Number(step.duration) || undefined);
        return;
      }
      if (action === "set" || action === "patch") {
        this.runtime.patchActor(actor, step.values || step.patch || {});
        return;
      }
      if (action === "place") {
        const target = step.to || step.target || step.anchor || step;
        if (isAnchorReference(target)) {
          await this.runtime.waitForAnchor(target, step);
        }
        this.runtime.placeActor(actor, target, step);
        return;
      }
      if (action === "motion") {
        await this.runtime.playMotion(actor, step.name, step);
        return;
      }
      if (getMotion(action)) {
        await this.runtime.playMotion(actor, action, { ...step, to: step.to || step.target });
        return;
      }
      if (action === "cue") {
        await this.playCue(step.name || step.cue, context);
        return;
      }

      this.emit("step:unknown", { step, context });
    }

    async playLine(step, actor = step.actor || step.id) {
      const gate = step.gate || step.waitFor || step.pause;
      if (gate === "reader") {
        await this.runtime.readerLine(actor, step.text || "", step);
        return;
      }

      const duration = gate === "continue"
        ? Number(step.duration || 86400000)
        : gate
          ? Number(step.duration || 60000)
          : Number(step.duration || 900);
      if (gate === "continue") {
        await this.runtime.waitForDialogueContinue(actor, step.text || "", { ...step, duration });
      } else if (gate === "timed" && !this.reducedMotion) {
        this.runtime.speak(actor, step.text || "", { ...step, duration });
        await delay(duration, { scaled: false });
      } else if (step.hold && !this.reducedMotion) {
        this.runtime.speak(actor, step.text || "", { ...step, duration });
        await delay(Number(step.hold) || 0);
      } else {
        this.runtime.speak(actor, step.text || "", { ...step, duration });
      }
      if (step.clear !== false && gate) {
        this.runtime.quiet(actor);
      }
    }

    async playConversation(step) {
      const lines = normalizeCutsceneTimeline(step.lines || step.sequence || []);
      for (let index = 0; index < lines.length; index += 1) {
        if (this.cancelled) {
          return;
        }
        const line = {
          ...step,
          ...(lines[index] || {}),
          do: "line",
          gate: lines[index]?.gate ?? step.gate,
          label: lines[index]?.label || `${step.label || "conversation"} line ${index + 1}`
        };
        delete line.lines;
        delete line.sequence;
        await this.playLine(line, line.actor || step.actor);
        if ((line.waitAfter || line.delayAfter) && !this.reducedMotion) {
          await delay(Number(line.waitAfter ?? line.delayAfter) || 0);
        }
      }
    }
  }

  function registerCutscene(assetOrId, maybeAsset) {
    const asset = typeof assetOrId === "string" ? { ...(maybeAsset || {}), id: assetOrId } : assetOrId;
    if (!asset || typeof asset !== "object" || !asset.id) {
      return null;
    }
    cutsceneAssetRegistry.set(asset.id, asset);
    return asset;
  }

  async function loadCutscene(url, options = {}) {
    if (!url || typeof fetch !== "function") {
      return null;
    }
    const response = await fetch(url, {
      cache: options.cache || "default",
      credentials: options.credentials || "same-origin"
    });
    if (!response.ok) {
      throw new Error(`Cutscene asset failed to load: ${url} (${response.status})`);
    }
    const asset = await response.json();
    if (options.id && asset && typeof asset === "object") {
      asset.id ||= options.id;
    }
    registerCutscene(asset);
    return asset;
  }

  function getCutscene(id) {
    return cutsceneAssetRegistry.get(id) || null;
  }

  function listCutscenes() {
    return [...cutsceneAssetRegistry.values()].map((asset) => ({
      id: asset.id,
      version: asset.version || 1,
      title: asset.title || asset.id,
      description: asset.description || "",
      authoring: asset.authoring || null,
      actors: Object.keys(asset.actors || {}),
      anchors: Object.keys(asset.anchors || {}),
      cues: Object.entries(asset.cues || {}).map(([id, cue]) => ({
        id,
        title: cue.title || cue.label || id,
        description: cue.description || "",
        steps: normalizeCutsceneTimeline(cue.timeline || cue).length
      }))
    }));
  }

  function registerCutsceneAction(id, handler) {
    if (!id || typeof handler !== "function") {
      return null;
    }
    cutsceneActionRegistry.set(id, handler);
    return handler;
  }

  registerCutsceneAction("stxHacking", async ({ runtime, step }) => {
    const actorId = step.actor || "stx";
    const actor = runtime.patchActor(actorId, { visible: true });
    if (!actor) {
      return;
    }

    const duration = Number(step.duration) || 2600;
    const scaledDuration = animationDuration(duration);
    const startedAt = performance.now();
    const colors = step.colors || [vgaColor(0x3a), vgaColor(0x3b), vgaColor(0x3d), vgaColor(0x0f)];
    const codes = (step.codes || ["/", "|", "\\", "-", "0", "1", "#", "*", "+", "%"])
      .map((value) => typeof value === "number" ? value : String(value).charCodeAt(0) & 0xff);
    const originalAttachments = Array.isArray(actor.attachments) ? actor.attachments.slice() : [];
    const terminalText = runtime.ctx ? await createTerminalTextRenderer(runtime.ctx).catch(() => null) : null;
    if (!terminalText) {
      console.error("SohEngine.stxHacking skipped CP437 rain because TerminalTextRenderer is unavailable.");
    }

    const removeRain = runtime.addEffect((ctx, now, rect) => {
      const elapsed = now - startedAt;
      const requestedColumns = Math.floor(Number(step.columns) || 0);
      const requestedParticles = Math.floor(Number(step.particles) || 0);
      const columns = Math.max(36, requestedColumns || Math.floor(rect.width / 11));
      const stormColumns = Math.max(12, Math.floor(Number(step.stormColumns) || columns * 0.34));
      const scale = Math.max(1, Math.min(2, Math.floor(rect.width / 640) + 1));
      const actorState = runtime.actorStates?.get?.(actorId) || null;
      const actorX = actorState?.x ?? rect.width * 0.72;
      const actorY = actorState?.y ?? rect.height * 0.52;
      const rainTotal = Math.max(columns, requestedParticles || 0);
      ctx.save();
      for (let index = 0; index < rainTotal; index += 1) {
        const seed = index * 17.31 + 9;
        const columnIndex = index % columns;
        const drift = Math.sin(elapsed / 420 + seed) * (2 + pseudoRandom(seed + 6) * 7);
        const x = Math.round((columnIndex + pseudoRandom(seed) * 0.75) * rect.width / columns + drift);
        const speed = 76 + pseudoRandom(seed + 1) * 235;
        const y = ((elapsed * speed / 1000) + pseudoRandom(seed + 2) * rect.height * 1.65 + index * 5) % (rect.height + 130) - 80;
        const length = 3 + Math.floor(pseudoRandom(seed + 3) * 8);
        for (let row = 0; row < length; row += 1) {
          const alpha = clamp(0.72 - row * 0.07, 0.05, 0.84);
          ctx.globalAlpha = alpha;
          const color = colors[(index + row + Math.floor(elapsed / 90)) % colors.length];
          const code = codes[(index * 3 + row + Math.floor(elapsed / 70)) % codes.length];
          const glyphY = y - row * TERMINAL_FONT_HEIGHT * scale;
          if (terminalText) {
            terminalText.drawGlyph(code, x, glyphY, scale, color);
          }
        }
      }
      for (let index = 0; index < stormColumns; index += 1) {
        const seed = index * 29.13 + 41;
        const spread = 50 + pseudoRandom(seed + 4) * 190;
        const angle = elapsed / 190 + seed;
        const x = actorX + Math.cos(angle) * spread + Math.sin(elapsed / 85 + index) * 28;
        const y = actorY - 42 + ((elapsed * (0.18 + pseudoRandom(seed + 1) * 0.38) + index * 23) % Math.max(80, rect.height * 0.42));
        const scaleBoost = scale + (pseudoRandom(seed + 2) > 0.72 ? 1 : 0);
        ctx.globalAlpha = clamp(0.88 - pseudoRandom(seed + 3) * 0.32, 0.22, 0.9);
        const color = colors[(index + Math.floor(elapsed / 55)) % colors.length];
        const code = codes[(index * 5 + Math.floor(elapsed / 48)) % codes.length];
        if (terminalText) {
          terminalText.drawGlyph(code, x, y, scaleBoost, color);
        }
      }
      ctx.restore();
    }, { layer: step.layer || "background", region: step.effectRegion || step.region || "viewport" });

    await runtime.showActor(actorId);
    while (performance.now() - startedAt < scaledDuration) {
      const frame = Math.floor((performance.now() - startedAt) / 95);
      runtime.patchActor(actorId, {
        mouth: frame % 9 === 0 ? mouthFrames.unhappy : mouthFrames.hmm,
        commandUntil: performance.now() + 180,
        attachments: [
          ...originalAttachments,
          {
            slot: "rightHand",
            type: "text",
            text: frame % 2 === 0 ? "[__]" : "[##]",
            color: colors[frame % colors.length],
            scale: 0.62,
            offset: { x: 1.1, y: 0.45 },
            tilt: -5 + frame % 4 * 3,
            layer: "front"
          }
        ]
      });
      await delay(90);
    }

    removeRain();
    runtime.patchActor(actorId, {
      attachments: originalAttachments,
      commandUntil: 0,
      mouth: mouthFrames.hmm
    });
  });

  registerCutsceneAction("terminalPoke", async ({ runtime, step }) => {
    const actorId = step.actor || "soh";
    const actor = runtime.patchActor(actorId, { visible: true });
    if (!actor) {
      return;
    }

    const target = step.target || step.to || step.anchor || null;
    if (target) {
      await runtime.waitForAnchor(target, step);
    }

    const duration = animationDuration(Number(step.duration) || 900);
    const startedAt = performance.now();
    const targetRect = target ? runtime.anchorRect(target) : null;
    const originalAttachments = Array.isArray(actor.attachments) ? actor.attachments.slice() : [];
    const baseAttachments = originalAttachments.filter((attachment) => attachment?.id !== "terminal-poke-tool");
    const toolText = step.toolText || "////";
    const toolColor = step.toolColor || actor.bodyColor || YELLOW;
    const terminalText = runtime.ctx ? await createTerminalTextRenderer(runtime.ctx).catch(() => null) : null;
    if (!terminalText) {
      console.error("SohEngine.terminalPoke skipped CP437 sparks because TerminalTextRenderer is unavailable.");
    }
    const colors = step.sparkColors || [YELLOW, "#ffb000", "#ff5555", "#aa0000"];
    const codes = (step.sparkCodes || ["*", "+", "/", "\\", "x", "."])
      .map((value) => typeof value === "number" ? value : String(value).charCodeAt(0) & 0xff);

    if (step.attachTool !== false) {
      runtime.patchActor(actorId, {
        attachments: [
          ...baseAttachments,
          {
            id: "terminal-poke-tool",
            slot: step.toolSlot || "leftHand",
            type: step.toolType || "slashStick",
            text: toolText,
            count: Number(step.toolCount) || 5,
            color: toolColor,
            scale: Number(step.toolScale) || 0.82,
            offset: step.toolOffset || { x: -2.15, y: -0.15 },
            tilt: Number(step.toolTilt ?? -22),
            layer: "front"
          }
        ]
      });
    }

    runtime.gesture(actorId, step.gesture || "poke", duration);

    const updateToolPose = (progress) => {
      if (step.attachTool === false) {
        return;
      }
      const jab = Math.sin(Math.PI * clamp((progress - 0.08) / 0.7, 0, 1));
      const shake = Math.sin(progress * Math.PI * 10) * 4 * jab;
      runtime.patchActor(actorId, {
        attachments: [
          ...baseAttachments,
          {
            id: "terminal-poke-tool",
            slot: step.toolSlot || "leftHand",
            type: step.toolType || "slashStick",
            text: toolText,
            count: Number(step.toolCount) || 5,
            color: toolColor,
            scale: Number(step.toolScale) || 0.82,
            offset: {
              x: Number(step.toolOffset?.x ?? -2.15) - jab * 0.42,
              y: Number(step.toolOffset?.y ?? -0.15) - jab * 0.08
            },
            tilt: Number(step.toolTilt ?? -22) - jab * 18 + shake,
            layer: "front"
          }
        ]
      });
    };

    const removeSparks = runtime.addEffect((ctx, now) => {
      const elapsed = now - startedAt;
      const progress = clamp(elapsed / duration, 0, 1);
      const rect = targetRect || runtime.currentActorState(actorId) || { x: 0, y: 0, width: 20, height: 20 };
      const contact = targetRect ? anchorPointFromRect(targetRect, step) : {
        x: rect.x + (rect.width || 20) * 0.5,
        y: rect.y + (rect.height || 20) * 0.45
      };
      const centerX = contact.x;
      const centerY = contact.y;
      const burst = Math.sin(Math.PI * clamp((progress - 0.2) / 0.62, 0, 1));
      ctx.save();
      for (let index = 0; index < 24; index += 1) {
        const seed = index * 37.71 + 3;
        const angle = pseudoRandom(seed) * Math.PI * 2;
        const radius = (6 + pseudoRandom(seed + 1) * 42) * burst;
        const jitter = Math.sin(elapsed / 45 + index) * 3;
        const x = centerX + Math.cos(angle) * radius + jitter;
        const y = centerY + Math.sin(angle) * radius - Math.abs(Math.sin(elapsed / 90 + index)) * 8;
        const alpha = clamp(1 - progress * 0.85 - index * 0.012, 0, 0.92);
        const scale = 1 + Math.floor(pseudoRandom(seed + 2) * 2);
        const color = colors[(index + Math.floor(elapsed / 80)) % colors.length];
        const code = codes[(index + Math.floor(elapsed / 65)) % codes.length];
        ctx.globalAlpha = alpha;
        if (terminalText) {
          terminalText.drawGlyph(code, x, y, scale, color);
        }
      }
      ctx.restore();
    }, { layer: step.layer || "foreground" });

    while (performance.now() - startedAt < duration) {
      updateToolPose(clamp((performance.now() - startedAt) / duration, 0, 1));
      await delay(45, { scaled: false });
    }
    updateToolPose(1);
    removeSparks();
    if (step.keepTool !== true) {
      runtime.patchActor(actorId, { attachments: originalAttachments });
    }
  });

  registerCutsceneAction("dialogSummon", async ({ runtime, step }) => {
    const duration = animationDuration(Number(step.duration) || 1300);
    const startedAt = performance.now();
    const terminalText = runtime.ctx ? await createTerminalTextRenderer(runtime.ctx).catch(() => null) : null;
    if (!terminalText) {
      console.error("SohEngine.dialogSummon skipped CP437 particles because TerminalTextRenderer is unavailable.");
    }
    const colors = step.colors || [vgaColor(0x3a), vgaColor(0x3d), vgaColor(0x0f), vgaColor(0x3b)];
    const codes = (step.codes || ["+", "-", "|", "/", "\\", "#", "*", "0", "1"])
      .map((value) => typeof value === "number" ? value : String(value).charCodeAt(0) & 0xff);
    const particles = Math.max(48, Math.floor(Number(step.particles) || 128));

    const remove = runtime.addEffect((ctx, now, rect) => {
      const elapsed = now - startedAt;
      const progress = clamp(elapsed / duration, 0, 1);
      const t = easeInOut(progress);
      const dialogWidth = Math.min(rect.width - 32, Number(step.width) || 560);
      const dialogHeight = Number(step.height) || 190;
      const left = rect.width * 0.5 - dialogWidth * 0.5;
      const top = rect.height * 0.5 - dialogHeight * 0.5;
      ctx.save();
      for (let index = 0; index < particles; index += 1) {
        const seed = index * 19.97 + 11;
        const edge = index % 4;
        const edgeT = pseudoRandom(seed + 1);
        const targetX = edge < 2
          ? left + edgeT * dialogWidth
          : edge === 2 ? left : left + dialogWidth;
        const targetY = edge < 2
          ? (edge === 0 ? top : top + dialogHeight)
          : top + edgeT * dialogHeight;
        const startX = pseudoRandom(seed + 2) * rect.width;
        const startY = pseudoRandom(seed + 3) * rect.height;
        const orbit = Math.sin(progress * Math.PI * 6 + seed) * (1 - t) * 38;
        const x = lerp(startX, targetX, t) + orbit;
        const y = lerp(startY, targetY, t) + Math.cos(progress * Math.PI * 5 + seed) * (1 - t) * 24;
        ctx.globalAlpha = clamp(0.22 + t * 0.72, 0, 0.95);
        const scale = 1 + Math.floor(pseudoRandom(seed + 4) * 2);
        const code = codes[(index + Math.floor(elapsed / 70)) % codes.length];
        const color = colors[(index + Math.floor(elapsed / 95)) % colors.length];
        if (terminalText) {
          terminalText.drawGlyph(code, x, y, scale, color);
        }
      }
      ctx.restore();
    }, { layer: step.layer || "foreground" });

    await delay(duration, { scaled: false });
    remove();
  });

  function validateCutscene(assetOrId, options = {}) {
    const asset = typeof assetOrId === "string" ? getCutscene(assetOrId) : assetOrId;
    const errors = new CutsceneDirector(null).validate(asset);
    if (!asset || typeof asset !== "object") {
      return errors;
    }
    if (options.requireAuthoring !== false) {
      if (!asset.title) {
        errors.push("asset: missing title.");
      }
      if (!asset.description) {
        errors.push("asset: missing description.");
      }
      if (!asset.authoring?.intent) {
        errors.push("asset.authoring: missing intent.");
      }
      if (!asset.authoring?.coordinatePolicy) {
        errors.push("asset.authoring: missing coordinatePolicy.");
      }
      if (!asset.authoring?.cuePolicy) {
        errors.push("asset.authoring: missing cuePolicy.");
      }
      Object.entries(asset.actors || {}).forEach(([id, actor]) => {
        if (!actor.description) {
          errors.push(`actors.${id}: missing description.`);
        }
      });
      Object.entries(asset.cues || {}).forEach(([id, cue]) => {
        if (!cue.title) {
          errors.push(`cues.${id}: missing title.`);
        }
        if (!cue.description) {
          errors.push(`cues.${id}: missing description.`);
        }
      });
    }
    return errors;
  }

  async function playCutscene(idOrAsset, runtime, options = {}) {
    const asset = typeof idOrAsset === "string" ? getCutscene(idOrAsset) : idOrAsset;
    const director = new CutsceneDirector(runtime, options);
    director.load(asset);
    await director.play();
    return director;
  }

  const animationRegistry = new Map();

  function registerAnimation(definition) {
    if (!definition || typeof definition !== "object" || typeof definition.id !== "string" || !definition.id.trim()) {
      return null;
    }

    const existing = animationRegistry.get(definition.id) || {};
    const normalized = {
      load: "core",
      group: "Lab",
      tags: [],
      publicSite: "lab-only",
      ...existing,
      ...definition,
      id: definition.id.trim()
    };
    normalized.tags = Array.isArray(normalized.tags)
      ? normalized.tags.filter(Boolean)
      : String(normalized.tags || "").split(/\s+/).filter(Boolean);
    animationRegistry.set(normalized.id, normalized);
    return normalized;
  }

  function getAnimation(id) {
    return animationRegistry.get(id) || null;
  }

  function listAnimations() {
    return [...animationRegistry.values()].map((definition) => {
      const { loader, module, promise, ...metadata } = definition;
      return clone(metadata);
    });
  }

  async function resolveAnimation(id) {
    const definition = getAnimation(id);
    if (!definition) {
      return null;
    }
    if (definition.module || definition.load === "core") {
      return definition;
    }
    if (!definition.promise) {
      definition.promise = loadAnimationDefinition(definition);
    }
    await definition.promise;
    return definition;
  }

  async function loadAnimationDefinition(definition) {
    if (typeof definition.loader === "function") {
      const loaded = await definition.loader(definition);
      definition.module = loaded?.default || loaded || true;
      return definition.module;
    }
    if (definition.moduleUrl) {
      const loaded = await import(definition.moduleUrl);
      definition.module = loaded?.default || loaded || true;
      return definition.module;
    }
    definition.module = true;
    return definition.module;
  }

  function animationLoadPlan(definitionOrId) {
    const definition = typeof definitionOrId === "string" ? getAnimation(definitionOrId) : definitionOrId;
    if (!definition) {
      return "Unknown animation.";
    }
    if (definition.load === "core") {
      return "Core bundle: available immediately, good for shared primitives and default demos.";
    }
    if (definition.load === "lazy") {
      return definition.moduleUrl
        ? `Lazy chunk: load ${definition.moduleUrl} on first use, then keep it cached.`
        : "Lazy chunk: register a loader/moduleUrl and load on first use.";
    }
    if (definition.load === "deferred") {
      return "Deferred: candidate for a low-priority idle-time preload after the page becomes interactive.";
    }
    return String(definition.load || "Unspecified load strategy.");
  }

  const animations = {
    register: registerAnimation,
    get: getAnimation,
    list: listAnimations,
    resolve: resolveAnimation,
    loadPlan: animationLoadPlan
  };

  applyAnimationSpeed();
  writeReadingPreferences(readHydratedReadingPreferences());

  window.SohEngine = {
    constants: {
      SOURCE_WIDTH,
      SOURCE_HEIGHT,
      TERMINAL_FONT_WIDTH,
      TERMINAL_FONT_HEIGHT,
      TERMINAL_FONT_URL,
      YELLOW,
      RED,
      CHARACTER_STORAGE_KEY,
      CHARACTER_LIBRARY_KEY,
      SCENE_LIBRARY_KEY,
      MOTION_STORAGE_KEY,
      ANIMATION_SPEED_STORAGE_KEY,
      ANIMATION_SPEED_QUERY_PARAM,
      READING_PREFERENCES_ELEMENT_ID,
      DEFAULT_READING_SPEED_PERCENT,
      MIN_READING_SPEED_PERCENT,
      MAX_READING_SPEED_PERCENT,
      DEFAULT_DIALOGUE_DWELL_BASE_MS,
      DEFAULT_DIALOGUE_DWELL_PER_CHAR_MS,
      DEFAULT_DIALOGUE_DWELL_PUNCTUATION_MS,
      DEFAULT_DIALOGUE_DWELL_MIN_MS,
      DEFAULT_DIALOGUE_DWELL_MAX_MS,
      MOTION_ALLOW,
      MOTION_REDUCE,
      REDUCED_MOTION_QUERY_PARAM,
      SCENE_PIXEL_RATIO_CAPPED,
      SCENE_PIXEL_RATIO_NATIVE,
      DEFAULT_SCENE_MAX_PIXEL_RATIO
    },
    vgaPalette,
    rows: { soh: sohRows, stx: stxRows },
    baseEyes,
    mouthFrames,
    glyphVariants,
    defaultCharacterDefinition,
    SceneDirector,
    StorageLibrary,
    normalizeCharacterDefinition,
    normalizeScenePreset,
    readJsonInput,
    filledGlyphPixels,
    CharacterRenderer,
    characterItemAttachments,
    normalizeCharacterGlow,
    DialogueManager,
    ChopAnimationPresenter,
    SceneRuntime,
    SceneScript,
    CutsceneDirector,
    createOverlayLayer,
    createPanelLayer,
    domTargets,
    motionPreference,
    writeMotionPreference,
    animationSpeed,
    animationDuration,
    animationDelay,
    applyAnimationSpeed,
    writeAnimationSpeed,
    readingPreferences,
    readingSpeed,
    dialogueTextWeight,
    dialogueDwellDuration,
    shouldRequireDialogueContinue,
    writeReadingPreferences,
    waitPrompts,
    sourcePointToWorld,
    normalizeSceneDesign,
    sceneLayout,
    projectDesignPoint,
    resolveScenePoint,
    resolveAnchorPoint,
    findTextRange,
    textAnchor,
    buildTerminalGlyphPixels,
    loadTerminalFont,
    TerminalTextRenderer,
    createTerminalTextRenderer,
    pseudoRandom,
    clamp,
    cycleProgress,
    cycleIndex,
    smoothstep,
    easeInOut,
    lerp,
    normalizeVgaIndex,
    vgaColor,
    clone,
    slugify,
    cutscenes: {
      register: registerCutscene,
      load: loadCutscene,
      get: getCutscene,
      list: listCutscenes,
      validate: validateCutscene,
      play: playCutscene,
      actions: {
        register: registerCutsceneAction
      }
    },
    animations,
    chopAnimations: {
      register: registerChopAnimation,
      load: loadChopAnimation,
      get: getChopAnimation,
      list: listChopAnimations,
      apply: applyChopAnimation
    },
    motions: {
      register: registerMotion,
      get: getMotion,
      applyPose: applyMotionPose,
      list: listMotions
    }
  };
})();
