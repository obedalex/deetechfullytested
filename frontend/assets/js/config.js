// assets/js/config.js

/**
 * ==========================
 * CENTRAL API CONFIG (GLOBAL)
 * ==========================
 */

// Base backend URL (runtime-config.js is the shared deployment override)
const RUNTIME_CONFIG =
  (typeof window !== "undefined" && window.DEETECH_RUNTIME_CONFIG) ||
  {};

const BASE_URL =
  (typeof window !== "undefined" && window.DEETECH_API_BASE) ||
  RUNTIME_CONFIG.apiBase ||
  "http://localhost:5000";

// API groups
const API_BASE = `${BASE_URL}/api`;
const API_BASE_AUTH = `${API_BASE}/auth`;
const API_BASE_USERS = `${API_BASE}/users`;
const API_BASE_PRODUCTS = `${API_BASE}/products`;
const API_BASE_CART = `${API_BASE}/cart`;
const API_BASE_ORDERS = `${API_BASE}/orders`;
const API_BASE_SUPPORT = `${API_BASE}/support`;

// EmailJS (orders + support; override by setting window.DEETECH_EMAILJS before this script)
const EMAILJS_SERVICE_ID =
  (typeof window !== "undefined" && window.DEETECH_EMAILJS?.serviceId) ||
  "service_lixosu5";
const EMAILJS_PUBLIC_KEY =
  (typeof window !== "undefined" && window.DEETECH_EMAILJS?.publicKey) ||
  "CBbrohaBqT3R-haon";
const EMAILJS_ADMIN_ORDER_TEMPLATE_ID =
  (typeof window !== "undefined" && window.DEETECH_EMAILJS?.adminOrderTemplateId) ||
  "template_7blr0y9";
const EMAILJS_ORDER_TEMPLATE_ID =
  (typeof window !== "undefined" && window.DEETECH_EMAILJS?.orderTemplateId) ||
  "template_uxr4yom";
const EMAILJS_SUPPORT_TEMPLATE =
  (typeof window !== "undefined" && window.DEETECH_EMAILJS?.supportTemplate) ||
  "template_b8az4bq";

// Admin + support info (for order email template params)
const ADMIN_EMAIL =
  (typeof window !== "undefined" && window.DEETECH_ADMIN?.email) ||
  "deetechcomputers01@gmail.com";
const ADMIN_FIRST_NAME =
  (typeof window !== "undefined" && window.DEETECH_ADMIN?.firstName) ||
  "Daniel";
const ADMIN_LAST_NAME =
  (typeof window !== "undefined" && window.DEETECH_ADMIN?.lastName) ||
  "Adjei Mensah";
const ADMIN_PHONE =
  (typeof window !== "undefined" && window.DEETECH_ADMIN?.phone) ||
  "+233591755964";
const SUPPORT_WHATSAPP_NUMBER =
  (typeof window !== "undefined" && window.DEETECH_SUPPORT?.whatsAppNumber) ||
  "233591755964";
const SUPPORT_EMAIL =
  (typeof window !== "undefined" && window.DEETECH_SUPPORT?.email) ||
  "deetechcomputers01@gmail.com";

/**
 * ==========================
 * CART HELPERS
 * ==========================
 */
function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem("cart")) || [];
    if (!Array.isArray(raw)) return [];
    const MAX_QTY = 99;
    const normalizeQty = (val) => {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 1) return 1;
      return Math.min(Math.round(n), MAX_QTY);
    };
    const map = new Map();
    raw.forEach((item) => {
      const id = String(item.productId || item._id || item.id || "");
      if (!id) return;
      const qty = normalizeQty(item.qty || item.quantity || 1);
      const existing = map.get(id);
      if (existing) {
        existing.qty = normalizeQty(Math.max(existing.qty || 0, qty));
      } else {
        map.set(id, {
          ...item,
          _id: item._id || item.productId || item.id,
          productId: item.productId || item._id || item.id,
          qty,
        });
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function saveCart(cart) {
  const MAX_QTY = 99;
  const normalizeQty = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(Math.round(n), MAX_QTY);
  };
  const map = new Map();
  (cart || []).forEach((item) => {
    const id = String(item.productId || item._id || item.id || "");
    if (!id) return;
    const qty = normalizeQty(item.qty || item.quantity || 1);
    const existing = map.get(id);
    if (existing) {
      existing.qty = normalizeQty(Math.max(existing.qty || 0, qty));
    } else {
      map.set(id, {
        ...item,
        _id: item._id || item.productId || item.id,
        productId: item.productId || item._id || item.id,
        qty,
      });
    }
  });
  localStorage.setItem("cart", JSON.stringify(Array.from(map.values())));
  document.dispatchEvent(new Event("cart-updated"));
}

function clearCart() {
  saveCart([]);
}

/**
 * ==========================
 * TOAST HELPER
 * ==========================
 */
function ensureGlobalToastStyles() {
  if (document.getElementById("deetechToastStyles")) return;
  const style = document.createElement("style");
  style.id = "deetechToastStyles";
  style.textContent = `
    .deetech-toast-wrap {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 120000;
      display: grid;
      gap: 10px;
      max-width: min(420px, calc(100vw - 24px));
      pointer-events: none;
    }
    .deetech-toast {
      pointer-events: auto;
      border-radius: 12px;
      padding: 10px 12px;
      color: #fff;
      font-size: 0.92rem;
      font-weight: 600;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.25);
      animation: deetechToastIn 0.22s ease-out;
      word-break: break-word;
    }
    .deetech-toast--success { background: #15803d; }
    .deetech-toast--error { background: #b91c1c; }
    .deetech-toast--warning { background: #b45309; }
    .deetech-toast--info { background: #1d4ed8; }
    @keyframes deetechToastIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 768px) {
      .deetech-toast-wrap {
        left: 10px;
        right: 10px;
        bottom: 12px;
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function getToastWrap() {
  ensureGlobalToastStyles();
  let wrap = document.getElementById("deetechToastWrap");
  if (wrap) return wrap;
  wrap = document.createElement("div");
  wrap.id = "deetechToastWrap";
  wrap.className = "deetech-toast-wrap";
  document.body.appendChild(wrap);
  return wrap;
}

function configShowToast(msg, type = "info") {
  if (window.showToast && window.showToast !== configShowToast) {
    return window.showToast(msg, type);
  }
  const wrap = getToastWrap();
  const toast = document.createElement("div");
  const t = String(type || "info").toLowerCase();
  const variant = ["success", "error", "warning", "info"].includes(t) ? t : "info";
  toast.className = `deetech-toast deetech-toast--${variant}`;
  toast.textContent = String(msg || "");
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2400);
}

// Expose globally for non-module scripts
window.CONFIG = {
  BASE_URL,
  API_BASE,
  API_BASE_AUTH,
  API_BASE_USERS,
  API_BASE_PRODUCTS,
  API_BASE_CART,
  API_BASE_ORDERS,
  API_BASE_SUPPORT,
  EMAILJS_SERVICE_ID,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_ADMIN_ORDER_TEMPLATE_ID,
  EMAILJS_ORDER_TEMPLATE_ID,
  EMAILJS_SUPPORT_TEMPLATE,
  ADMIN_EMAIL,
  ADMIN_FIRST_NAME,
  ADMIN_LAST_NAME,
  ADMIN_PHONE,
  SUPPORT_WHATSAPP_NUMBER,
  SUPPORT_EMAIL,
  loadCart,
  saveCart,
  clearCart,
  showToast: configShowToast,
};

// Offline resilience: register service worker for static asset caching
if (
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  (window.location.protocol === "http:" || window.location.protocol === "https:")
) {
  window.addEventListener("load", () => {
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.includes("/admin/")) return;
    const swPath = path.includes("/frontend/") ? "/frontend/sw.js" : "sw.js";
    navigator.serviceWorker.register(swPath).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

// Network status indicator + floating support chat
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const shouldSkipFloatingSupportChat = () => {
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.includes("/admin/")) return true;
    return path.endsWith("/checkout.html") || path.endsWith("/cart.html");
  };

  const ensureFloatingSupportChat = () => {
    if (shouldSkipFloatingSupportChat()) return;
    if (document.getElementById("deetechFloatingSupport")) return;

    const style = document.createElement("style");
    style.id = "deetechFloatingSupportStyle";
    style.textContent = `
      #deetechFloatingSupport {
        position: fixed;
        right: 18px;
        bottom: 128px;
        z-index: 100000;
        font-family: inherit;
      }
      body.mobile-menu-open #deetechFloatingSupport {
        display: none;
      }
      .deetech-chat-fab {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 0;
        background: #ff4f7a;
        color: #fff;
        box-shadow: 0 14px 32px rgba(255, 79, 122, 0.35);
        cursor: pointer;
        display: grid;
        place-items: center;
      }
      .deetech-chat-fab svg { width: 26px; height: 26px; fill: currentColor; }
      .deetech-chat-panel {
        width: min(320px, calc(100vw - 32px));
        background: #fff;
        border: 1px solid #f0f0f0;
        border-radius: 16px;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        margin-bottom: 12px;
        display: none;
      }
      .deetech-chat-panel.open { display: block; }
      body.filters-open .deetech-chat-panel,
      body.filters-open .deetech-chat-fab {
        display: none !important;
      }
      .deetech-chat-head {
        position: relative;
        background: #ff4f7a;
        color: #fff;
        padding: 14px 14px 12px;
      }
      .deetech-chat-close {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 0;
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
      }
      .deetech-chat-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .deetech-chat-head h4 {
        margin: 0 0 6px;
        font-size: 26px;
        line-height: 1.1;
        font-weight: 700;
      }
      .deetech-chat-head p {
        margin: 0;
        font-size: 16px;
        opacity: 0.98;
      }
      .deetech-chat-body {
        background: #f4f4f5;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 360px;
        overflow-y: auto;
      }
      .deetech-chat-thread {
        max-height: 180px;
        overflow-y: auto;
      }
      .deetech-chat-thread {
        min-height: 160px;
        max-height: 240px;
        overflow-y: auto;
        border: 1px solid #d5d7de;
        border-radius: 10px;
        background: #fff;
        padding: 8px;
        margin-bottom: 10px;
      }
      .deetech-chat-msg {
        max-width: 92%;
        border-radius: 10px;
        padding: 7px 9px;
        margin-bottom: 8px;
        font-size: 13px;
        line-height: 1.35;
      }
      .deetech-chat-msg.user { background: #ffebf1; margin-left: auto; }
      .deetech-chat-msg.admin { background: #eef2ff; margin-right: auto; }
      .deetech-chat-meta {
        display: block;
        margin-top: 5px;
        font-size: 10px;
        color: #64748b;
      }
      .deetech-chat-guest {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }
      .deetech-chat-input,
      .deetech-chat-textarea {
        width: 100%;
        border: 1px solid #d5d7de;
        border-radius: 10px;
        padding: 9px 10px;
        font-size: 16px;
        color: #111827;
        background: #fff;
      }
      .deetech-chat-textarea { min-height: 70px; resize: vertical; }
      .deetech-chat-actions { display: flex; gap: 8px; margin-top: 8px; }
      .deetech-chat-send,
      .deetech-chat-whatsapp {
        border: 0;
        border-radius: 10px;
        padding: 9px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        text-align: center;
      }
      .deetech-chat-send { background: #2563eb; color: #fff; flex: 1; }
      .deetech-chat-send:disabled { opacity: 0.65; cursor: not-allowed; }
      .deetech-chat-whatsapp { background: #0f766e; color: #fff; }
      .deetech-chat-note { font-size: 11px; color: #475569; margin: 6px 0 0; }
      @media (max-width: 480px) {
        #deetechFloatingSupport { right: 12px; bottom: 108px; }
        .deetech-chat-panel {
          width: min(300px, calc(100vw - 32px));
          max-height: 380px;
          margin-bottom: 8px;
        }
        .deetech-chat-head {
          padding: 12px 12px 10px;
        }
        .deetech-chat-head h4 { font-size: 16px; }
        .deetech-chat-head p { font-size: 12px; }
        .deetech-chat-body { padding: 10px; max-height: 320px; }
        .deetech-chat-thread { max-height: 120px; }
        .deetech-chat-msg { font-size: 12px; }
        .deetech-chat-input,
        .deetech-chat-textarea {
          padding: 8px 9px;
          font-size: 16px;
        }
        .deetech-chat-actions { flex-direction: column; gap: 6px; }
        .deetech-chat-send,
        .deetech-chat-whatsapp { width: 100%; padding: 8px 10px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "deetechFloatingSupport";
    wrap.innerHTML = `
      <div class="deetech-chat-panel" id="deetechChatPanel" aria-hidden="true">
        <div class="deetech-chat-head">
          <h4>Hi there &#128075;</h4>
          <p>Welcome to our website. Ask us anything &#127881;</p>
          <button class="deetech-chat-close" id="deetechChatClose" type="button" aria-label="Close chat">&times;</button>
        </div>
        <div class="deetech-chat-body">
          <div class="deetech-chat-thread" id="deetechChatThread">
            <div class="deetech-chat-msg admin">
              Welcome! Send your message and support will reply here.
              <span class="deetech-chat-meta">Support</span>
            </div>
          </div>
          <div class="deetech-chat-guest" id="deetechChatGuestFields">
            <input class="deetech-chat-input" id="deetechChatName" type="text" placeholder="Your name" />
            <input class="deetech-chat-input" id="deetechChatEmail" type="email" placeholder="Your email" />
          </div>
          <textarea class="deetech-chat-textarea" id="deetechChatMessage" placeholder="Type your message..."></textarea>
          <div class="deetech-chat-actions">
            <button class="deetech-chat-send" id="deetechChatSend" type="button">Send</button>
            <a class="deetech-chat-whatsapp" href="https://wa.me/${SUPPORT_WHATSAPP_NUMBER}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
          <p class="deetech-chat-note" id="deetechChatNote">Messages are delivered to support inbox.</p>
        </div>
      </div>
      <button class="deetech-chat-fab" id="deetechChatFab" type="button" aria-label="Open support chat">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 2H4a2 2 0 0 0-2 2v18l4-3h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"></path>
        </svg>
      </button>
    `;
    document.body.appendChild(wrap);

    const panel = document.getElementById("deetechChatPanel");
    const fab = document.getElementById("deetechChatFab");
    const thread = document.getElementById("deetechChatThread");
    const note = document.getElementById("deetechChatNote");
    const sendBtn = document.getElementById("deetechChatSend");
    const messageInput = document.getElementById("deetechChatMessage");
    const closeBtn = document.getElementById("deetechChatClose");
    const guestFields = document.getElementById("deetechChatGuestFields");
    const guestNameInput = document.getElementById("deetechChatName");
    const guestEmailInput = document.getElementById("deetechChatEmail");
    if (!panel || !fab || !thread || !sendBtn || !messageInput) return;

    const authApi = window.auth || {};
    const getToken = typeof authApi.getToken === "function" ? authApi.getToken : () => null;
    const getUser = typeof authApi.getUser === "function" ? authApi.getUser : () => null;

    const escapeHtml = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const formatDate = (value) => {
      const d = value ? new Date(value) : null;
      if (!d || Number.isNaN(d.getTime())) return "";
      return d.toLocaleString();
    };

    const appendMessage = (sender, text, createdAt) => {
      const row = document.createElement("div");
      row.className = `deetech-chat-msg ${sender === "admin" ? "admin" : "user"}`;
      row.innerHTML = `
        ${escapeHtml(text)}
        <span class="deetech-chat-meta">${sender === "admin" ? "Support" : "You"}${createdAt ? ` &bull; ${escapeHtml(formatDate(createdAt))}` : ""}</span>
      `;
      thread.appendChild(row);
      thread.scrollTop = thread.scrollHeight;
    };

    const setNote = (text, kind = "info") => {
      if (!note) return;
      note.textContent = text;
      note.style.color = kind === "error" ? "#b91c1c" : kind === "success" ? "#166534" : "#475569";
    };

    const setLoading = (loading) => {
      sendBtn.disabled = loading;
      sendBtn.textContent = loading ? "Sending..." : "Send";
    };

    const toThreadMessages = (tickets) => {
      const rows = [];
      (Array.isArray(tickets) ? tickets : []).forEach((ticket) => {
        const baseTime = ticket?.createdAt || ticket?.updatedAt || new Date().toISOString();
        const ticketMessages = Array.isArray(ticket?.messages) ? ticket.messages : [];
        if (ticketMessages.length) {
          ticketMessages.forEach((m) => {
            if (!m?.text) return;
            rows.push({
              sender: m.sender === "admin" ? "admin" : "user",
              text: m.text,
              createdAt: m.createdAt || baseTime,
            });
          });
        } else if (ticket?.message) {
          rows.push({
            sender: "user",
            text: ticket.message,
            createdAt: baseTime,
          });
        }
        if (ticket?.response) {
          const hasAdminResponse = ticketMessages.some(
            (m) => m?.sender === "admin" && String(m?.text || "").trim() === String(ticket.response || "").trim()
          );
          if (!hasAdminResponse) {
            rows.push({
              sender: "admin",
              text: ticket.response,
              createdAt: ticket?.updatedAt || baseTime,
            });
          }
        }
      });
      rows.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      return rows.slice(-80);
    };

    const loadExistingThread = async () => {
      const token = getToken();
      const user = getUser();
      if (!token || !user?.email) {
        if (guestFields) guestFields.style.display = "grid";
        return;
      }
      if (guestFields) guestFields.style.display = "none";
      try {
        const res = await fetch(`${API_BASE_SUPPORT}/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data) || !data.length) return;

        const history = toThreadMessages(data);
        if (history.length) {
          thread.innerHTML = "";
          history.forEach((m) => {
            appendMessage(m.sender, m.text, m.createdAt);
          });
          setNote("Loaded your recent support history.", "success");
        }
      } catch (err) {
        console.warn("Floating support chat load failed:", err);
      }
    };

    const sendMessage = async () => {
      const rawMessage = String(messageInput.value || "").trim();
      if (!rawMessage) {
        setNote("Type a message first.", "error");
        return;
      }

      const token = getToken();
      const user = getUser();
      const guestName = String(guestNameInput?.value || "").trim();
      const guestEmail = String(guestEmailInput?.value || "").trim();

      if (!token && (!guestName || !guestEmail)) {
        setNote("Please enter your name and email.", "error");
        return;
      }

      setLoading(true);
      try {
        appendMessage("user", rawMessage, new Date().toISOString());

        // Always create a support ticket so admin "Messages" page sees each send clearly.
        const name = user?.name || guestName || "Guest";
        const email = user?.email || guestEmail;
        const res = await fetch(`${API_BASE_SUPPORT}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name,
            email,
            subject: "Website Chat",
            message: rawMessage,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to send");

        messageInput.value = "";
        setNote("Message sent. Support will reply shortly.", "success");
        const tokenNow = getToken();
        if (tokenNow) {
          await loadExistingThread();
        }
      } catch (err) {
        console.error(err);
        setNote(err.message || "Could not send message.", "error");
      } finally {
        setLoading(false);
      }
    };

    const setPanelOpen = (open) => {
      panel.classList.toggle("open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      if (!open) {
        panel.setAttribute("inert", "");
        if (panel.contains(document.activeElement)) {
          fab?.focus();
        }
      } else {
        panel.removeAttribute("inert");
      }
    };

    panel.setAttribute("inert", "");

    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      setPanelOpen(!panel.classList.contains("open"));
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        setPanelOpen(false);
      });
    }

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) {
        setPanelOpen(false);
      }
    });

    sendBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    loadExistingThread();
  };

  const removeNetworkBanner = () => {
    const banner = document.getElementById("networkStatusBanner");
    if (banner) banner.remove();
  };

  window.addEventListener("load", ensureFloatingSupportChat);
  window.addEventListener("load", removeNetworkBanner);
}

