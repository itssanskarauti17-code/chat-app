const socket = io();

// ================= CALL POPUP =================
const callPopup = document.getElementById("callPopup");
const callText = document.getElementById("callText");
const acceptCallBtn = document.getElementById("acceptCallBtn");
const rejectCallBtn = document.getElementById("rejectCallBtn");

function showCallPopup(text) {
    callText.innerText = text || "Incoming Call...";
    callPopup.style.display = "block";
}

function hideCallPopup() {
    callPopup.style.display = "none";
}

// ================= OUTGOING CALL BUTTONS =================
document.addEventListener("DOMContentLoaded", () => {

    const audioBtn = document.getElementById("audioCallBtn");
    const videoBtn = document.getElementById("videoCallBtn");

    if (audioBtn) {
        audioBtn.addEventListener("click", () => {

            const user = sessionStorage.getItem("loggedInUser")?.toLowerCase();
            const otherUser = user === "alex" ? "kitty" : "alex";

            socket.emit("audioCall", {
                from: user,
                to: otherUser
            });

            showCallPopup("📞 Calling...");
        });
    }

    if (videoBtn) {
        videoBtn.addEventListener("click", () => {

            const user = sessionStorage.getItem("loggedInUser")?.toLowerCase();
            const otherUser = user === "alex" ? "kitty" : "alex";

            socket.emit("videoCall", {
                from: user,
                to: otherUser
            });

            showCallPopup("🎥 Calling...");
        });
    }

    // ================= ACCEPT =================
    if (acceptCallBtn) {
        acceptCallBtn.addEventListener("click", () => {
            hideCallPopup();
            alert("Call Accepted ✅");
        });
    }

    // ================= REJECT =================
    if (rejectCallBtn) {
        rejectCallBtn.addEventListener("click", () => {
            hideCallPopup();
            alert("Call Rejected ❌");
        });
    }
});

// ================= INCOMING CALLS (REAL FIX) =================
socket.on("audioCallIncoming", (data) => {
    showCallPopup("📞 Incoming Audio Call from " + data.from);
});

socket.on("videoCallIncoming", (data) => {
    showCallPopup("🎥 Incoming Video Call from " + data.from);
});