// ============================================
// Pesocnica Pay — Crypto Card Wallet
// Vanilla JS, no build step. Mock on-chain data.
// ============================================

"use strict";

// ---------- State ----------
const CURRENCY_SYMBOLS = { EUR: "€", USD: "$", GBP: "£" };

const state = {
  connected: false,
  address: null,
  currency: localStorage.getItem("gp-currency") || "EUR",
  balance: 0,
  pending: 0,
  txFilter: "all",
  activeCardIndex: 0,
  cards: [
    { id: 1, last4: "4821", type: "Physical", frozen: false, brand: false },
    { id: 2, last4: "9043", type: "Virtual", frozen: false, brand: true },
  ],
  // Stored in base currency units; merchant + category drive the icon.
  transactions: [
    { merchant: "Spotify", category: "music", amount: -10.99, date: "Today, 09:14", status: "settled" },
    { merchant: "Add funds", category: "topup", amount: 500.0, date: "Today, 08:02", status: "settled" },
    { merchant: "Lidl", category: "groceries", amount: -42.18, date: "Yesterday", status: "settled" },
    { merchant: "Uber", category: "transport", amount: -13.5, date: "Yesterday", status: "pending" },
    { merchant: "Steam", category: "games", amount: -29.99, date: "May 23", status: "settled" },
    { merchant: "Salary", category: "topup", amount: 2400.0, date: "May 22", status: "settled" },
    { merchant: "Amazon", category: "shopping", amount: -76.4, date: "May 21", status: "settled" },
  ],
};

const CATEGORY_ICON = {
  music: "fa-music",
  topup: "fa-arrow-down",
  groceries: "fa-basket-shopping",
  transport: "fa-car",
  games: "fa-gamepad",
  shopping: "fa-bag-shopping",
  default: "fa-receipt",
};

// ---------- DOM helpers ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function sym() {
  return CURRENCY_SYMBOLS[state.currency] || "€";
}

function fmt(amount, withSign = false) {
  const sign = withSign && amount > 0 ? "+" : amount < 0 ? "-" : "";
  const value = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${sym()}${value}`;
}

// ---------- Rendering ----------
function renderBalance() {
  const total = state.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [int, dec] = total.split(".");
  $("#balanceAmount").innerHTML =
    `<span class="balance-int">${sym()}${int}</span><span class="balance-dec">.${dec}</span>`;

  const pendingPill = $("#pendingPill");
  if (state.pending > 0) {
    pendingPill.style.display = "inline-flex";
    $("#pendingAmount").textContent = fmt(state.pending);
  } else {
    pendingPill.style.display = "none";
  }
}

function renderTransactions() {
  const list = $("#txList");
  const items = state.transactions.filter((t) => {
    if (state.txFilter === "in") return t.amount > 0;
    if (state.txFilter === "out") return t.amount < 0;
    return true;
  });

  if (!state.connected) {
    list.innerHTML = `<div class="tx-empty">Connect your wallet to see transactions</div>`;
    return;
  }
  if (items.length === 0) {
    list.innerHTML = `<div class="tx-empty">No transactions yet</div>`;
    return;
  }

  list.innerHTML = items
    .map((t) => {
      const isIn = t.amount > 0;
      const icon = CATEGORY_ICON[t.category] || CATEGORY_ICON.default;
      const amountClass = t.status === "pending" ? "pending" : isIn ? "in" : "";
      const sub = t.status === "pending" ? `${t.date} · Pending` : t.date;
      return `
        <div class="tx-item">
          <div class="tx-icon ${isIn ? "in" : ""}"><i class="fa-solid ${icon}"></i></div>
          <div class="tx-main">
            <div class="tx-merchant">${escapeHtml(t.merchant)}</div>
            <div class="tx-sub">${escapeHtml(sub)}</div>
          </div>
          <div class="tx-amount ${amountClass}">${fmt(t.amount, true)}</div>
        </div>`;
    })
    .join("");
}

function renderMiniCards() {
  const wrap = $("#cardMiniList");
  wrap.innerHTML =
    state.cards
      .map(
        (c) => `
      <button class="card-mini" data-card="${c.id}">
        <div class="card-thumb ${c.brand ? "brandgrad" : ""} ${c.frozen ? "frozen" : ""}">
          <span class="chip-icon"></span>
        </div>
        <div class="card-mini-info">
          <div class="card-mini-num"><span class="mono">••• ${c.last4}</span></div>
          <div class="card-mini-type">${c.type}${c.frozen ? " · Frozen" : ""}</div>
        </div>
      </button>`
      )
      .join("") +
    `<button class="card-add" data-action="add-card">
      <span class="plus"><i class="fa-solid fa-plus"></i></span> Order a new card
    </button>`;
}

function renderCarousel() {
  const wrap = $("#carousel");
  wrap.innerHTML = state.cards
    .map(
      (c) => `
    <div class="credit-card ${c.brand ? "brandgrad" : ""} ${c.frozen ? "frozen" : ""}">
      <div class="cc-top">
        <span class="cc-brand">Pesocnica<span style="opacity:.6">Pay</span></span>
        <i class="fa-brands fa-bluetooth" style="opacity:0"></i>
      </div>
      <div class="cc-chip"></div>
      <div class="cc-number mono">••••  ••••  ••••  ${c.last4}</div>
      <div class="cc-bottom">
        <div>
          <div class="cc-label">Card holder</div>
          <div>${c.type === "Virtual" ? "Virtual card" : "Main card"}</div>
        </div>
        <div class="cc-network">VISA</div>
      </div>
    </div>`
    )
    .join("");

  renderCardControls();
}

function renderCardControls() {
  const card = state.cards[state.activeCardIndex] || state.cards[0];
  $("#cardControls").innerHTML = `
    <button class="cc-action ${card.frozen ? "active" : ""}" data-action="freeze">
      <span class="ico"><i class="fa-solid fa-snowflake"></i></span>
      ${card.frozen ? "Unfreeze" : "Freeze"}
    </button>
    <button class="cc-action" data-action="details">
      <span class="ico"><i class="fa-regular fa-eye"></i></span>
      Show PIN
    </button>
    <button class="cc-action" data-action="settings">
      <span class="ico"><i class="fa-solid fa-sliders"></i></span>
      Settings
    </button>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Navigation ----------
function switchView(view) {
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  $$("[data-view]").forEach((el) => {
    if (el.classList.contains("top-nav-link") || el.classList.contains("footer-link")) {
      el.classList.toggle("active", el.dataset.view === view);
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Wallet (mock) ----------
function randomAddress() {
  const hex = "0123456789abcdef";
  let a = "0x";
  for (let i = 0; i < 40; i++) a += hex[Math.floor(Math.random() * 16)];
  return a;
}

function shorten(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function connect() {
  state.connected = true;
  state.address = randomAddress();
  state.balance = 4827.61;
  state.pending = 13.5;
  updateConnectedUI();
  renderBalance();
  renderTransactions();
  toast("Wallet connected", "fa-circle-check");
}

function disconnect() {
  state.connected = false;
  state.address = null;
  state.balance = 0;
  state.pending = 0;
  updateConnectedUI();
  renderBalance();
  renderTransactions();
  switchView("home");
  toast("Wallet disconnected", "fa-circle-info");
}

function updateConnectedUI() {
  $("#connectLabel").textContent = state.connected ? shorten(state.address) : "Connect wallet";
  $("#accountName").textContent = state.connected ? "Pesocnica user" : "Not connected";
  $("#accountAddr").textContent = state.connected ? state.address : "—";
  $("#safeAddr").textContent = state.connected ? shorten(randomSafe()) : "—";
  $("#accountAvatar").textContent = state.connected ? "P" : "?";
}

let _safe = null;
function randomSafe() {
  if (!_safe) _safe = randomAddress();
  return _safe;
}

// ---------- Modal ----------
let modalMode = "send";
function openModal(mode) {
  if (!state.connected) {
    toast("Connect your wallet first", "fa-triangle-exclamation", true);
    return;
  }
  modalMode = mode;
  const isSend = mode === "send";
  $("#modalTitle").textContent = isSend ? "Send funds" : "Add funds";
  $("#modalFieldLabel").textContent = isSend ? "Recipient address" : "From address";
  $("#modalInput1").value = isSend ? "" : randomAddress();
  $("#modalInput1").placeholder = "0x…";
  $("#modalAmount").value = "";
  $("#amountPrefix").textContent = sym();
  $("#modalHint").textContent = isSend ? `Available: ${fmt(state.balance)}` : "Funds arrive after on-chain confirmation.";
  $("#modalHint").classList.remove("error");
  $("#modalOverlay").classList.add("open");
  $("#modalAmount").focus();
}

function closeModal() {
  $("#modalOverlay").classList.remove("open");
}

function confirmModal() {
  const amount = parseFloat($("#modalAmount").value);
  const hint = $("#modalHint");
  if (!amount || amount <= 0) {
    hint.textContent = "Enter a valid amount.";
    hint.classList.add("error");
    return;
  }
  if (modalMode === "send" && amount > state.balance) {
    hint.textContent = "Amount exceeds available balance.";
    hint.classList.add("error");
    return;
  }

  if (modalMode === "send") {
    state.balance -= amount;
    state.transactions.unshift({
      merchant: "Sent " + shorten($("#modalInput1").value || randomAddress()),
      category: "transport",
      amount: -amount,
      date: "Just now",
      status: "pending",
    });
    toast(`Sent ${fmt(amount)}`, "fa-paper-plane");
  } else {
    state.balance += amount;
    state.transactions.unshift({
      merchant: "Add funds",
      category: "topup",
      amount: amount,
      date: "Just now",
      status: "settled",
    });
    toast(`Added ${fmt(amount)}`, "fa-circle-check");
  }
  renderBalance();
  renderTransactions();
  closeModal();
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("gp-theme", theme);
  const icon = $("#themeToggle").querySelector("i");
  icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  const darkSwitch = $("#darkSwitch");
  if (darkSwitch) darkSwitch.checked = theme === "dark";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// ---------- Toast ----------
function toast(msg, icon = "fa-circle-check", isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.innerHTML = `<i class="fa-solid ${icon}"></i> ${escapeHtml(msg)}`;
  $("#toastWrap").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(20px)";
    el.style.transition = "all 0.25s ease";
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

// ---------- Clipboard ----------
async function copyAddress() {
  if (!state.address) {
    toast("Connect your wallet first", "fa-triangle-exclamation", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(state.address);
    toast("Address copied", "fa-copy");
  } catch {
    toast("Could not copy", "fa-triangle-exclamation", true);
  }
}

// ---------- Events ----------
function bindEvents() {
  // View navigation (header brand, top nav, footer nav, inline links)
  document.addEventListener("click", (e) => {
    const navEl = e.target.closest("[data-view]");
    if (navEl) {
      e.preventDefault();
      switchView(navEl.dataset.view);
      return;
    }

    const miniCard = e.target.closest("[data-card]");
    if (miniCard) {
      const idx = state.cards.findIndex((c) => c.id === Number(miniCard.dataset.card));
      state.activeCardIndex = Math.max(0, idx);
      switchView("cards");
      renderCardControls();
      return;
    }

    const actionEl = e.target.closest("[data-action]");
    if (actionEl) handleAction(actionEl.dataset.action);
  });

  $("#connectBtn").addEventListener("click", () => (state.connected ? switchView("account") : connect()));
  $("#disconnectBtn").addEventListener("click", disconnect);
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#darkSwitch").addEventListener("change", (e) => applyTheme(e.target.checked ? "dark" : "light"));
  $("#copyAddrBtn").addEventListener("click", copyAddress);

  $("#sendFundsBtn").addEventListener("click", () => openModal("send"));
  $("#addFundsBtn").addEventListener("click", () => openModal("add"));
  $("#modalClose").addEventListener("click", closeModal);
  $("#modalCancel").addEventListener("click", closeModal);
  $("#modalConfirm").addEventListener("click", confirmModal);
  $("#modalOverlay").addEventListener("click", (e) => {
    if (e.target === $("#modalOverlay")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Transaction filters
  $$("[data-txfilter]").forEach((chip) =>
    chip.addEventListener("click", () => {
      state.txFilter = chip.dataset.txfilter;
      $$("[data-txfilter]").forEach((c) => c.classList.toggle("active", c === chip));
      renderTransactions();
    })
  );

  // Currency
  $("#currencySelect").addEventListener("change", (e) => {
    state.currency = e.target.value;
    localStorage.setItem("gp-currency", state.currency);
    renderBalance();
    renderTransactions();
  });
}

function handleAction(action) {
  switch (action) {
    case "freeze": {
      const card = state.cards[state.activeCardIndex];
      card.frozen = !card.frozen;
      renderCarousel();
      renderMiniCards();
      toast(card.frozen ? "Card frozen" : "Card unfrozen", card.frozen ? "fa-snowflake" : "fa-fire");
      break;
    }
    case "details":
      toast("PIN: 4827 (demo)", "fa-eye");
      break;
    case "settings":
      toast("Card settings — coming soon", "fa-sliders");
      break;
    case "add-card":
      toast("Card order flow — coming soon", "fa-plus");
      break;
  }
}

// ---------- Init ----------
function init() {
  applyTheme(localStorage.getItem("gp-theme") || "light");
  $("#currencySelect").value = state.currency;
  bindEvents();
  renderBalance();
  renderTransactions();
  renderMiniCards();
  renderCarousel();
  updateConnectedUI();
}

document.addEventListener("DOMContentLoaded", init);
