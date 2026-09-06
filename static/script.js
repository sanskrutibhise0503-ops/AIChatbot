// ══════════════════════════════════════════════════
//  NOVA AI  –  LocalStorage + URL Routing
// ══════════════════════════════════════════════════

/** Safely parse Markdown → HTML */
function md(text) {
    return (typeof marked !== "undefined") ? marked.parse(text) : text;
}

/** Inject a Copy button into every <pre> inside an element */
function addCopyButtons(container) {
    container.querySelectorAll("pre").forEach(pre => {
        // Avoid double-adding
        if (pre.querySelector(".copy-btn")) return;

        const btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.textContent = "Copy";

        btn.addEventListener("click", () => {
            const code = pre.querySelector("code");
            const text = code ? code.innerText : pre.innerText;
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = "✅ Copied!";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.textContent = "Copy";
                    btn.classList.remove("copied");
                }, 2000);
            }).catch(() => {
                btn.textContent = "❌ Failed";
                setTimeout(() => { btn.textContent = "Copy"; }, 2000);
            });
        });

        // Make pre relative so btn can be absolute inside
        pre.style.position = "relative";
        pre.appendChild(btn);
    });
}

const messages     = document.getElementById("messages");
const input        = document.getElementById("message");
const historyEl    = document.getElementById("history");
const sidebar      = document.getElementById("sidebar");
const heroSection  = document.getElementById("heroSection");
const attachPopup  = document.getElementById("attachPopup");
const attachBtn    = document.getElementById("attachBtn");
const imageInput   = document.getElementById("imageInput");
const fileBadge    = document.getElementById("fileBadge");
const fileBadgeName= document.getElementById("fileBadgeName");

// ── Active chat state ──────────────────────────────
let activeChatId = null;   // null  = new / unsaved chat

// ── Helpers ───────────────────────────────────────

/** Generate a random chat ID like "h6rg748hutrfg8865fy4" */
function generateId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 20 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}

/** Read every saved chat from localStorage (array, newest first) */
function loadAllChats() {
    const index = JSON.parse(localStorage.getItem("nova_index") || "[]");
    return index.map(id => {
        const raw = localStorage.getItem("nova_chat_" + id);
        return raw ? JSON.parse(raw) : null;
    }).filter(Boolean);
}

/** Save / update a single chat object */
function saveChat(chat) {
    localStorage.setItem("nova_chat_" + chat.id, JSON.stringify(chat));

    // Keep the index up to date (newest first, no duplicates)
    let index = JSON.parse(localStorage.getItem("nova_index") || "[]");
    index = [chat.id, ...index.filter(id => id !== chat.id)];
    localStorage.setItem("nova_index", JSON.stringify(index));
}

/** Delete a single chat */
function deleteChat(id) {
    localStorage.removeItem("nova_chat_" + id);
    let index = JSON.parse(localStorage.getItem("nova_index") || "[]");
    index = index.filter(i => i !== id);
    localStorage.setItem("nova_index", JSON.stringify(index));
}

// ── Sidebar history rendering ──────────────────────

function renderSidebar() {
    historyEl.innerHTML = "";
    const chats = loadAllChats();
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = "history-item" + (chat.id === activeChatId ? " active" : "");
        item.dataset.id = chat.id;

        // Label (click to load)
        const label = document.createElement("span");
        label.className = "history-label";
        label.innerHTML = "💬 " + chat.title;
        label.addEventListener("click", () => loadChat(chat.id));

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.className = "history-delete-btn";
        delBtn.title = "Delete chat";
        delBtn.innerHTML = "🗑";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeChatById(chat.id);
        });

        item.appendChild(label);
        item.appendChild(delBtn);
        historyEl.appendChild(item);
    });
}

function removeChatById(id) {
    deleteChat(id);
    // If we're currently viewing this chat, reset to new chat
    if (activeChatId === id) {
        newChat();
    } else {
        renderSidebar();
    }
}

// ── Load a chat from localStorage into the UI ──────

function loadChat(id) {
    const raw = localStorage.getItem("nova_chat_" + id);
    if (!raw) return;
    const chat = JSON.parse(raw);

    activeChatId = id;

    // Clear existing bubbles (keep heroSection in DOM)
    messages.querySelectorAll(".user, .bot").forEach(b => b.remove());
    heroSection.style.display = "none";

    // Render messages
    chat.messages.forEach(m => {
        const div = document.createElement("div");
        div.className = m.role;
        div.innerHTML = m.role === "bot" ? md(m.text) : m.text;
        messages.appendChild(div);
        if (m.role === "bot") addCopyButtons(div);   // ← copy buttons
    });

    messages.scrollTop = messages.scrollHeight;

    // Update URL without reloading
    history.pushState({ chatId: id }, "", "/c/" + id);

    renderSidebar();
}

// ── New Chat ───────────────────────────────────────

function newChat() {
    activeChatId = null;

    // Clear bubbles, show hero
    messages.querySelectorAll(".user, .bot").forEach(b => b.remove());
    heroSection.style.display = "flex";

    input.value = "";
    removeFile();

    // Reset URL to root
    history.pushState({}, "", "/");

    renderSidebar();
}

// ── Hero / empty state ─────────────────────────────

function updateHero() {
    const hasBubbles = messages.querySelector(".user, .bot");
    heroSection.style.display = hasBubbles ? "none" : "flex";
}

// ── Send message ───────────────────────────────────

async function sendMessage() {
    const text = input.value.trim();
    if (text === "") return;

    // ── First message in a brand-new chat → create a chat record ──
    if (!activeChatId) {
        activeChatId = generateId();
        const newChatObj = {
            id:       activeChatId,
            title:    text.substring(0, 28),
            messages: []
        };
        saveChat(newChatObj);

        // Push the unique URL immediately (before AI replies)
        history.pushState({ chatId: activeChatId }, "", "/c/" + activeChatId);

        renderSidebar();
    }

    // Hide hero
    heroSection.style.display = "none";

    // Render user bubble
    const userDiv = document.createElement("div");
    userDiv.className = "user";
    userDiv.textContent = text;
    messages.appendChild(userDiv);
    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    // Typing indicator
    const typing = document.createElement("div");
    typing.className = "bot";
    typing.innerHTML = "⏳ AI is typing...";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
        const image = imageInput.files[0];
        const formData = new FormData();
        formData.append("message", text);
        if (image) formData.append("image", image);

        const response = await fetch("/chat", { method: "POST", body: formData });
        const data = await response.json();

        typing.remove();

        const botDiv = document.createElement("div");
        botDiv.className = "bot";
        botDiv.innerHTML = md(data.reply);
        messages.appendChild(botDiv);
        addCopyButtons(botDiv);   // ← copy buttons on live response

        // ── Persist both user + bot messages ──
        const raw   = localStorage.getItem("nova_chat_" + activeChatId);
        const chat  = raw ? JSON.parse(raw) : { id: activeChatId, title: text.substring(0, 28), messages: [] };
        chat.messages.push({ role: "user", text: text });
        chat.messages.push({ role: "bot",  text: data.reply });
        saveChat(chat);

        removeFile();

    } catch (error) {
        typing.remove();
        const errDiv = document.createElement("div");
        errDiv.className = "bot";
        errDiv.textContent = "❌ Something went wrong.";
        messages.appendChild(errDiv);
        console.error(error);
    }

    messages.scrollTop = messages.scrollHeight;
}

// ── Attach popup ───────────────────────────────────

function toggleAttachPopup() {
    const isOpen = attachPopup.classList.contains("open");

    if (isOpen) {
        attachPopup.classList.remove("open");
        attachBtn.classList.remove("active");
        return;
    }

    const rect = attachBtn.getBoundingClientRect();
    const gap  = 8;
    const bottomFromViewport = window.innerHeight - rect.top + gap;
    let left = rect.left;

    attachPopup.style.transform = "";
    attachPopup.style.top       = "";
    attachPopup.style.bottom    = bottomFromViewport + "px";
    attachPopup.style.left      = left + "px";

    const popupWidth = 220;
    if (left + popupWidth > window.innerWidth - 12) {
        attachPopup.style.left = (window.innerWidth - popupWidth - 12) + "px";
    }

    attachPopup.classList.add("open");
    attachBtn.classList.add("active");
}

function triggerImageUpload() {
    attachPopup.classList.remove("open");
    attachBtn.classList.remove("active");
    imageInput.click();
}

function removeFile() {
    imageInput.value = "";
    fileBadge.style.display = "none";
}

imageInput.addEventListener("change", function () {
    if (imageInput.files.length > 0) {
        const name = imageInput.files[0].name;
        fileBadgeName.textContent = "📎 " + (name.length > 16 ? name.substring(0, 14) + "…" : name);
        fileBadge.style.display = "flex";
    } else {
        fileBadge.style.display = "none";
    }
});

document.addEventListener("click", function (e) {
    if (!attachBtn.contains(e.target) && !attachPopup.contains(e.target)) {
        attachPopup.classList.remove("open");
        attachBtn.classList.remove("active");
    }
});

// ── Misc ──────────────────────────────────────────

function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
    document.querySelector(".container").classList.toggle("sidebar-collapsed");
}

function fillSuggestion(text) {
    input.value = text;
    input.focus();
}

input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
});

// ── Browser back / forward navigation ─────────────
window.addEventListener("popstate", function (e) {
    if (e.state && e.state.chatId) {
        loadChat(e.state.chatId);
    } else {
        newChat();
    }
});

// ── Boot: check if URL already has a chat ID ──────
(function boot() {
    const match = window.location.pathname.match(/^\/c\/([a-z0-9]+)$/);
    if (match) {
        const id = match[1];
        const raw = localStorage.getItem("nova_chat_" + id);
        if (raw) {
            loadChat(id);
        } else {
            // Unknown ID → go to root
            history.replaceState({}, "", "/");
        }
    }
    renderSidebar();
})();