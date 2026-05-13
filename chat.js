const socket = io();

// ================= LOGIN =================
const user = sessionStorage.getItem("loggedInUser");
if (!user) location.href = "login.html";

const me = user.toLowerCase();
const otherUser = me === "alex" ? "kitty" : "alex";

// ================= ELEMENTS =================
const input = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const partnerName = document.getElementById("partner-name");
const statusText = document.getElementById("status-text");
const fileInput = document.getElementById("file-input");
const emojiBtn = document.getElementById("emoji-btn");

const audioCallBtn = document.getElementById("audioCallBtn");
const videoCallBtn = document.getElementById("videoCallBtn");

const typingDiv = document.getElementById("typing-area");

// ================= INIT =================
console.log("chat.js loaded");

partnerName.innerText = me === "alex" ? "Kitty" : "Alex";

// ================= CONNECT =================
socket.on("connect", () => {
    socket.emit("userOnline", me);
});

// ================= ONLINE STATUS =================
socket.on("onlineUsers", (data) => {

    const onlineUsers = data.onlineUsers || {};
    const lastSeen = data.lastSeen || {};

    if (onlineUsers[otherUser]) {
        statusText.innerText = "online";
        statusText.style.color = "#25D366";
        return;
    }

    const last = lastSeen[otherUser];

    if (!last) {
        statusText.innerText = "offline";
        statusText.style.color = "gray";
        return;
    }

    const diffMin = Math.floor((Date.now() - last) / 60000);

    if (diffMin < 1) statusText.innerText = "last seen just now";
    else if (diffMin < 60) statusText.innerText = `last seen ${diffMin} min ago`;
    else statusText.innerText = `last seen ${Math.floor(diffMin / 60)} hr ago`;

    statusText.style.color = "gray";
});

// ================= SEND MESSAGE =================
function sendMessage() {

    if (!input.value.trim()) return;

    socket.emit("sendMessage", {
        id: Date.now().toString(),
        sender: me,
        text: input.value
    });

    input.value = "";
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ================= LOAD + RECEIVE =================
socket.on("loadMessages", (msgs) => {
    chatBox.innerHTML = "";
    msgs.forEach(renderMessage);
});

socket.on("receiveMessage", renderMessage);

// ================= RENDER MESSAGE =================
function renderMessage(data) {

    const div = document.createElement("div");
    div.classList.add("message");
    div.classList.add(data.sender === me ? "sent" : "received");
    div.id = data.id;

    let content = "";

    // ================= FILE FIX =================
    if (data.file) {

        const isVideo =
            data.file.includes("video") ||
            data.file.endsWith(".mp4");

        if (isVideo) {
            content = `<video src="${data.file}" controls class="chat-video"></video>`;
        } else {
            content = `<img src="${data.file}" class="chat-image" />`;
        }

    } else {
        content = `<div>${data.text || ""}</div>`;
    }

    div.innerHTML = `
        ${content}
        <div class="seen-text" id="seen-${data.id}"></div>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (data.sender !== me) {
        setTimeout(() => {
            socket.emit("messageSeen", {
                messageId: data.id
            });
        }, 200);
    }
}

// ================= SEEN UPDATE =================
socket.on("messageSeenUpdate", (data) => {

    const el = document.getElementById(`seen-${data.messageId}`);
    if (!el) return;

    el.innerText = `Seen • ${data.time}`;
    el.style.fontSize = "11px";
    el.style.color = "#4fc3f7";
});

// ================= DELETE =================
socket.on("deleteMessage", (id) => {
    const msg = document.getElementById(id);
    if (msg) msg.remove();
});

// ================= TYPING =================
let typingTimeout;

input.addEventListener("input", () => {
    socket.emit("typing", me);
});

socket.on("typing", (u) => {

    if (!u || u === me) return;

    typingDiv.innerText = `${u} is typing...`;

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        typingDiv.innerText = "";
    }, 1200);
});

// ================= EMOJI =================
emojiBtn.addEventListener("click", () => {
    input.value += "😊";
});

// ================= CALL BUTTONS =================
if (audioCallBtn) {
    audioCallBtn.addEventListener("click", () => {
        socket.emit("audioCall", { from: me, to: otherUser });
        showCallPopup("Audio call ringing...");
    });
}

if (videoCallBtn) {
    videoCallBtn.addEventListener("click", () => {
        socket.emit("videoCall", { from: me, to: otherUser });
        showCallPopup("Video call ringing...");
    });
}

// ================= FILE UPLOAD (MOBILE FIX) =================
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Mobile par badi files allow karne ke liye
    if (file.size > 10 * 1024 * 1024) { // 10MB Limit
        alert("File bahut badi hai! 10MB se choti photo bhejein.");
        return;
    }

    const reader = new FileReader();

    // Loading indicator dikhane ke liye (optional)
    typingDiv.innerText = "Sending photo...";

    reader.onload = (event) => {
        try {
            socket.emit("sendMessage", {
                id: Date.now().toString(),
                sender: me,
                text: "",
                file: event.target.result // Base64 Data
            });
            typingDiv.innerText = "";
            fileInput.value = ""; // Input reset taaki same photo dubara ja sake
        } catch (err) {
            console.error("Socket error:", err);
            alert("Connection error! Photo nahi gayi.");
        }
    };

    reader.onerror = () => {
        alert("Mobile gallery se photo read nahi ho payi.");
    };

    reader.readAsDataURL(file);
});


// ================= CALL POPUP =================
function showCallPopup(text) {

    const oldPopup = document.querySelector(".call-popup");
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement("div");
    popup.className = "call-popup";
    popup.innerText = text;

    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 3000);
}

// ================= INCOMING CALLS =================
socket.on("videoCallIncoming", (data) => {
    showCallPopup("Incoming Video Call 📞 from " + data.from);
});

socket.on("audioCallIncoming", (data) => {
    showCallPopup("Incoming Audio Call 📞 from " + data.from);
});