/* ═══════════ 留白画室 · 逻辑 ═══════════ */
"use strict";
const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

/* ---------- 状态 ---------- */
const state = {
  tool: "pen", color: "#1a1a1a", size: 4,
  drawing: false, lastX: 0, lastY: 0,
  undoStack: [], strokes: 0
};

/* ---------- 画布尺寸（跟随容器，DPR 适配） ---------- */
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const snap = state.undoStack.length ? null : canvas.toDataURL();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  /* 还原旧画（有历史时不清丢） */
  if (snap) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = snap;
  }
}
window.addEventListener("resize", resize);
resize();

/* ---------- 指针绘制 ---------- */
function pos(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function snapshot() {
  state.undoStack.push(canvas.toDataURL());
  if (state.undoStack.length > 25) state.undoStack.shift();
}
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  snapshot();
  state.drawing = true;
  [state.lastX, state.lastY] = pos(e);
  drawSeg(state.lastX, state.lastY, state.lastX + .01, state.lastY + .01);
});
canvas.addEventListener("pointermove", (e) => {
  if (!state.drawing) return;
  const [x, y] = pos(e);
  drawSeg(state.lastX, state.lastY, x, y);
  state.lastX = x; state.lastY = y;
});
["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
  canvas.addEventListener(ev, () => {
    if (!state.drawing) return;
    state.drawing = false;
    state.strokes++;
  }));

function drawSeg(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.globalCompositeOperation = state.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = state.color;
  ctx.lineWidth = state.tool === "eraser" ? state.size * 2.2 : state.size;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- 工具切换 ---------- */
document.querySelectorAll(".tool[data-tool]").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".tool[data-tool]").forEach(x => x.classList.toggle("on", x === b));
  state.tool = b.dataset.tool;
  canvas.style.cursor = state.tool === "eraser" ? "cell" : "crosshair";
}));

/* ---------- 颜色 ---------- */
document.querySelectorAll(".dot[data-color]").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".dot").forEach(x => x.classList.toggle("on", x === b));
  state.color = b.dataset.color;
  /* 选色即切回画笔 */
  document.querySelectorAll(".tool[data-tool]").forEach(x =>
    x.classList.toggle("on", x.dataset.tool === "pen"));
  state.tool = "pen";
}));
$("customColor").addEventListener("input", (e) => {
  document.querySelectorAll(".dot[data-color]").forEach(x => x.classList.remove("on"));
  state.color = e.target.value;
  state.tool = "pen";
  document.querySelectorAll(".tool[data-tool]").forEach(x =>
    x.classList.toggle("on", x.dataset.tool === "pen"));
});

/* ---------- 粗细 ---------- */
$("sizeRange").addEventListener("input", (e) => {
  state.size = +e.target.value;
  const d = $("sizeDot");
  const s = Math.max(4, Math.min(26, state.size));
  d.style.setProperty("--sz", s + "px");
  d.firstElementChild?.remove();
  d.insertAdjacentHTML("beforeend", `<i style="width:${s}px;height:${s}px;border-radius:50%;background:var(--ink);display:block"></i>`);
});

/* ---------- 撤销 / 清空 / 保存 ---------- */
$("btnUndo").addEventListener("click", () => {
  const snap = state.undoStack.pop();
  if (!snap) return;
  const r = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
  img.src = snap;
});
$("btnClear").addEventListener("click", () => {
  snapshot();
  const r = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  state.strokes = 0;
});
$("btnSave").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = `atelier-${Date.now()}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
});
