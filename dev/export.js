// A read-only, viewport-sized report. Rendering never changes the live tracking canvas.
const ExportManager = {
  open() {
    if (this.overlay || CanvasManager.saving) return;
    const stats = AppState.currentSection === "player-stats-section";
    if (!stats && AppState.selectedPlayerIndex === null) {
      MenuManager.showToast("Select a player before exporting their shot map.");
      return;
    }
    this.returnFocus = document.activeElement;
    this.shots = CanvasManager.shotsList.map((shot) => ({ ...shot }));
    this.title = stats
      ? `Player ${AppState.currentPlayer.playerNumber}`
      : `Player ${AppState.gridNumbers[AppState.selectedPlayerIndex]}`;
    this.subtitle = stats
      ? AppState.currentPlayer.teamName
      : AppState.currentMatch.name;
    this.scope = stats
      ? `${AppState.selectedMatchFilters.size ? AppState.selectedMatchFilters.size + " selected matches" : "All matches"} · ${AppState.selectedShotTypeFilters.size ? [...AppState.selectedShotTypeFilters].map((type) => ({ static: "Static play", penalty: "7m penalty", counter: "Fast break" })[type]).join(", ") : "All shot types"}`
      : "Current match · All shot types";
    this.overlay = document.createElement("div");
    this.overlay.className = "export-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-label", "Shot report screenshot mode");
    this.overlay.innerHTML =
      '<canvas class="export-canvas" role="img" aria-label="Player shot report"></canvas><div class="export-controls"><p>Hide controls, then take a screenshot.<br>Tap the report to show controls again.</p><div><button class="back-btn" data-action="close">← Exit</button><button class="back-btn" data-action="fullscreen">Full screen</button><button class="back-btn" data-action="hide">Hide controls</button><button class="primary-btn" data-action="download">Save PNG ↓</button></div></div>';
    document.body.append(this.overlay);
    document.body.classList.add("exporting");
    this.inertElements = [...document.body.children].filter(
      (el) => el !== this.overlay && !el.inert,
    );
    this.inertElements.forEach((el) => {
      el.inert = true;
    });
    this.canvas = this.overlay.querySelector("canvas");
    this.canvas.onclick = () => {
      this.overlay.classList.remove("controls-hidden");
      this.overlay.querySelector("[data-action=hide]").focus();
    };
    this.overlay.querySelector("[data-action=close]").onclick = () =>
      this.close();
    this.overlay.querySelector("[data-action=hide]").onclick = () =>
      this.overlay.classList.add("controls-hidden");
    this.overlay.querySelector("[data-action=download]").onclick = () =>
      this.download();
    const fullscreen = this.overlay.querySelector("[data-action=fullscreen]");
    fullscreen.hidden = !this.overlay.requestFullscreen;
    fullscreen.onclick = () =>
      this.overlay
        .requestFullscreen()
        .catch(() =>
          MenuManager.showToast("Use Hide controls to capture this screen."),
        );
    this.onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
      if (event.key === "Tab" && this.overlay) {
        this.overlay.classList.remove("controls-hidden");
        const buttons = [...this.overlay.querySelectorAll("button")].filter(
          (button) => !button.hidden,
        );
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons.at(-1).focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === buttons.at(-1)
        ) {
          event.preventDefault();
          buttons[0].focus();
        }
      }
    };
    document.addEventListener("keydown", this.onKey);
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this.overlay);
    this.draw();
    this.overlay.querySelector("button").focus();
  },

  draw() {
    if (!this.overlay) return;
    const w = this.overlay.clientWidth,
      h = this.overlay.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    const ctx = this.canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#f5f5ef";
    ctx.fillRect(0, 0, w, h);
    const pad = Math.max(20, Math.min(w, h) * 0.045);
    const landscape = w > h * 1.15;
    const text = (
      value,
      x,
      y,
      size,
      color = "#152d31",
      weight = 500,
      maxWidth = w - 2 * pad,
    ) => {
      ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(value, x, y, maxWidth);
    };
    text("COURTSIDE  /  SHOT REPORT", pad, pad + 12, 11, "#295a48", 750);
    text(this.title, pad, pad + 48, 30, "#152d31", 750);
    text(this.subtitle, pad, pad + 70, 14, "#697773");
    text(this.scope, pad, pad + 91, 11, "#697773");
    const top = pad + 112;
    const footer = 42;
    let courtSize, courtX, courtY, statsX, statsY, statsW;
    if (landscape) {
      courtSize = Math.max(60, Math.min(h - top - footer, w * 0.62 - pad * 2));
      courtX = pad + (w * 0.62 - pad * 2 - courtSize) / 2;
      courtY = top;
      statsX = w * 0.65;
      statsY = top;
      statsW = w - statsX - pad;
    } else {
      courtSize = Math.max(60, Math.min(w - 2 * pad, h - top - footer - 102));
      courtX = (w - courtSize) / 2;
      courtY = top + Math.max(0, (h - top - footer - 102 - courtSize) / 2);
      statsX = pad;
      statsY = h - footer - 92;
      statsW = w - 2 * pad;
    }
    const pitch = document.createElement("canvas");
    pitch.width = 1200;
    pitch.height = 1200;
    const pitchContext = pitch.getContext("2d");
    pitchContext.scale(1200 / courtSize, 1200 / courtSize);
    const renderer = Object.assign(Object.create(CanvasManager), {
      canvas: { width: courtSize, height: courtSize },
      ctx: pitchContext,
      canvasWidth: courtSize,
      canvasHeight: courtSize,
      pitchBounds: {
        x: courtSize * 0.05,
        y: courtSize * 0.07,
        w: courtSize * 0.91,
        h: courtSize * 0.91,
      },
      shotsList: this.shots,
      currentShot: { points: [], shotType: "static" },
      cleanReport: true,
    });
    renderer.render();
    ctx.drawImage(pitch, courtX, courtY, courtSize, courtSize);
    const goals = this.shots.filter((shot) => shot.goal).length;
    const values = [
      [this.shots.length, "SHOTS"],
      [goals, "GOALS"],
      [this.shots.length - goals, "SAVES / MISSES"],
      [
        this.shots.length
          ? Math.round((goals / this.shots.length) * 100) + "%"
          : "—",
        "ACCURACY",
      ],
    ];
    const columns = landscape ? 2 : 4;
    const cellW = statsW / columns;
    const rowH = landscape ? Math.min(80, (h - top - footer) / 2) : 70;
    values.forEach(([value, label], i) => {
      const x = statsX + (i % columns) * cellW,
        y = statsY + Math.floor(i / columns) * rowH;
      text(
        String(value),
        x,
        y + 30,
        landscape ? 28 : 26,
        "#152d31",
        750,
        cellW - 8,
      );
      text(label, x, y + 50, 8, "#697773", 650, cellW - 8);
    });
    ctx.fillStyle = "#dfe4db";
    ctx.fillRect(pad, h - footer, w - 2 * pad, 1);
    text("● Goal", pad, h - 20, 10, "green");
    text("● Save / miss", pad + 52, h - 20, 10, "#c63c3c");
    text("COURTSIDE", w - pad - 72, h - 20, 10, "#697773", 650, 80);
    this.canvas.setAttribute(
      "aria-label",
      `${this.title}, ${this.subtitle}. ${this.scope}. ${this.shots.length} shots, ${goals} goals.`,
    );
  },

  download() {
    this.draw();
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `courtside-${this.title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
  },

  close() {
    if (!this.overlay) return;
    if (document.fullscreenElement === this.overlay)
      document.exitFullscreen().catch(() => {});
    this.observer.disconnect();
    document.removeEventListener("keydown", this.onKey);
    this.overlay.remove();
    this.overlay = null;
    document.body.classList.remove("exporting");
    this.inertElements.forEach((el) => {
      el.inert = false;
    });
    this.returnFocus?.focus();
  },
};
