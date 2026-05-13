
const peer = new Peer(); 
let localStream;
let currentCall; // Call tracks rakhne ke liye

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
    if(user) {
        socket.emit("registerPeer", { username: user, peerId: id });
    }
});

// ================= OUTGOING CALL =================
async function initiateCall(type) {
    const user = sessionStorage.getItem("loggedInUser")?.toLowerCase();
    const otherUser = user === "alex" ? "kitty" : "alex";

    try {
        // Step 1: Camera/Mic permission lo
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: type === 'video' 
        });

        // Step 2: Samne wale ko signal bhejo Socket se
        socket.emit(type === 'video' ? "videoCall" : "audioCall", {
            from: user,
            to: otherUser,
            peerId: peer.id 
        });

        showCallPopup(type === 'video' ? "🎥 Calling..." : "📞 Calling...");
    } catch (err) {
        console.error(err);
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

// ================= CALL HANDLING LOGIC =================

// Jab koi aapko peer se call karega (Final Connection)
peer.on('call', (call) => {
    currentCall = call;
    // Hum sirf tab answer karenge jab accept button click hoga
});

function setupAcceptButton(data, isVideo) {
    acceptCallBtn.onclick = async () => {
        hideCallPopup();
        try {
            // Permission lo answer dene ke liye
            localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: isVideo 
            });
            
            if (currentCall) {
                // Agar Peer call request aa chuki hai
                currentCall.answer(localStream);
                handleCallStream(currentCall);
            } else {
                // Agar abhi tak peer call nahi aayi, toh khud call initiate karo
                const call = peer.call(data.peerId, localStream);
                handleCallStream(call);
            }
            
            // Video grid dikhao
            const grid = document.getElementById('video-grid');
            if(grid) grid.style.display = 'flex'; // 'flex' use karo taaki center dikhe

        } catch (err) {
            console.error(err);
            alert("Call accept karne mein problem aayi!");
        }
    };
}

function handleCallStream(call) {
    call.on('stream', (remoteStream) => {
        const remoteVideo = document.getElementById('remote-video');
        if(remoteVideo) {
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play();
        }

        const localVideo = document.getElementById('local-video');
        if(localVideo && localStream) {
            localVideo.srcObject = localStream;
            localVideo.play();
        }
    });
}

// ================= REJECT / END CALL =================
rejectCallBtn?.addEventListener("click", () => {
    hideCallPopup();
    endCall();
});

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (currentCall) {
        currentCall.close();
    }
    const grid = document.getElementById('video-grid');
    if(grid) grid.style.display = 'none';
    
    socket.emit("callRejected");
}