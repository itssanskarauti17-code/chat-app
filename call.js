const socket = io();
const peer = new Peer(); 
let localStream;

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

// Peer ID register karna
peer.on('open', (id) => {
    const user = sessionStorage.getItem("loggedInUser")?.toLowerCase();
    socket.emit("registerPeer", { username: user, peerId: id });
});

// ================= OUTGOING CALL =================
async function initiateCall(type) {
    const user = sessionStorage.getItem("loggedInUser")?.toLowerCase();
    const otherUser = user === "alex" ? "kitty" : "alex";

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: type === 'video' 
        });

        socket.emit(type === 'video' ? "videoCall" : "audioCall", {
            from: user,
            to: otherUser,
            peerId: peer.id 
        });

        showCallPopup(type === 'video' ? "🎥 Calling..." : "📞 Calling...");
    } catch (err) {
        alert("Camera ya Microphone ki permission nahi mili!");
    }
}

document.getElementById("audioCallBtn")?.addEventListener("click", () => initiateCall('audio'));
document.getElementById("videoCallBtn")?.addEventListener("click", () => initiateCall('video'));

// ================= INCOMING CALL (SIGNALLING) =================
socket.on("audioCallIncoming", (data) => {
    showCallPopup("📞 Incoming Audio Call from " + data.from);
    setupAcceptButton(data, false);
});

socket.on("videoCallIncoming", (data) => {
    showCallPopup("🎥 Incoming Video Call from " + data.from);
    setupAcceptButton(data, true);
});

// ================= ANSWERING LOGIC (MISSING PART FIXED) =================
// Jab koi aapko peer se call karega, tab ye trigger hoga
peer.on('call', (call) => {
    // Humne popup dikhaya hua hai, jaise hi accept dabega ye answer hoga
    window.incomingCall = call; 
});

function setupAcceptButton(data, isVideo) {
    acceptCallBtn.onclick = async () => {
        hideCallPopup();
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
            
            // AGAR HUM CALL KAR RAHE HAIN
            if (callText.innerText.includes("Calling")) {
                const call = peer.call(data.peerId, localStream);
                handleCallStream(call);
            } 
            // AGAR HUM CALL UTHA RAHE HAIN
            else if (window.incomingCall) {
                window.incomingCall.answer(localStream);
                handleCallStream(window.incomingCall);
            }
            
            alert("Call Connected ✅");
        } catch (err) {
            alert("Call connection error!");
        }
    };
}

function handleCallStream(call) {
    call.on('stream', (remoteStream) => {
        const grid = document.getElementById('video-grid');
        if(grid) grid.style.display = 'block';
        
        const remoteVideo = document.getElementById('remote-video');
        if(remoteVideo) remoteVideo.srcObject = remoteStream;

        if (localStream) {
            const localVideo = document.getElementById('local-video');
            if(localVideo) localVideo.srcObject = localStream;
        }
    });
}

rejectCallBtn?.addEventListener("click", () => {
    hideCallPopup();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    socket.emit("callRejected");
});