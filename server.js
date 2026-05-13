const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 1e8,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// ================= DB =================
const dbURI = "mongodb+srv://Sanskar:Sudhi%4024@cluster0.uawz0db.mongodb.net/chatApp?retryWrites=true&w=majority";

mongoose.connect(dbURI, { serverSelectionTimeoutMS: 5000, family: 4 })
  .then(() => console.log("MongoDB Connected ✔"))
  .catch((err) => console.log("DB Error:", err.message));

// ================= MODEL =================
const MessageSchema = new mongoose.Schema({
  id: String,
  sender: String,
  receiver: String, // Added for better filtering
  text: String,
  file: String,
  seen: { type: Boolean, default: false },
  seenAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", MessageSchema);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ================= STATE =================
let onlineUsers = {};
let lastSeen = {};
let userSocketMap = {}; 
let userPeerMap = {}; 

// ================= SOCKET =================
io.on("connection", async (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("userOnline", (username) => {
    if (!username) return;
    const name = username.toLowerCase();
    socket.username = name;
    onlineUsers[name] = true;
    userSocketMap[name] = socket.id;
    delete lastSeen[name];
    io.emit("onlineUsers", { onlineUsers, lastSeen });
  });

  // 🔥 REFRESH FIX: Database se purani chats nikal kar bhejna
  socket.on("fetchOldMessages", async (data) => {
    try {
      // Wo messages uthao jo ya to unseen hain, ya fir seen hoke 10 min nahi hue
      const msgs = await Message.find({
        $or: [
          { seen: false },
          { seen: true, seenAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } }
        ]
      }).sort({ createdAt: 1 });
      
      socket.emit("loadMessages", msgs);
    } catch (err) {
      console.log("Fetch Error:", err);
    }
  });

  socket.on("registerPeer", (data) => {
    if (data.username) {
      userPeerMap[data.username.toLowerCase()] = data.peerId;
      console.log(`Peer Registered: ${data.username} -> ${data.peerId}`);
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const msg = await Message.create(data);
      io.emit("receiveMessage", msg);
    } catch (err) {
      console.log("Save Error:", err);
    }
  });

  socket.on("typing", () => {
    if (!socket.username) return;
    socket.broadcast.emit("typing", socket.username);
    clearTimeout(socket.typingTimer);
    socket.typingTimer = setTimeout(() => {
      socket.broadcast.emit("typing", null);
    }, 1200);
  });

  socket.on("messageSeen", async (data) => {
    const msg = await Message.findOne({ id: data.messageId });
    if (!msg || msg.seen) return;
    msg.seen = true;
    msg.seenAt = new Date();
    await msg.save();
    io.emit("messageSeenUpdate", { 
      messageId: data.messageId, 
      time: msg.seenAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    });
  });

  // ================= CALL SYSTEM =================
  socket.on("audioCall", (data) => {
    const targetSocket = userSocketMap[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit("audioCallIncoming", { from: data.from, peerId: data.peerId });
    }
  });

  socket.on("videoCall", (data) => {
    const targetSocket = userSocketMap[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit("videoCallIncoming", { from: data.from, peerId: data.peerId });
    }
  });

  socket.on("disconnect", () => {
    if (!socket.username) return;
    const name = socket.username;
    delete onlineUsers[name];
    delete userSocketMap[name];
    delete userPeerMap[name]; 
    lastSeen[name] = Date.now();
    io.emit("onlineUsers", { onlineUsers, lastSeen });
  });
});

// ================= AUTO DELETE (10 MIN SEEN) =================
setInterval(async () => {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const expiredMsgs = await Message.find({ seen: true, seenAt: { $lte: tenMinAgo } });
    
    if (expiredMsgs.length > 0) {
      for (let msg of expiredMsgs) {
        await Message.deleteOne({ _id: msg._id });
        io.emit("deleteMessage", msg.id);
      }
      console.log(`${expiredMsgs.length} messages deleted automatically.`);
    }
  } catch (err) {
    console.log("Cleanup Error:", err);
  }
}, 30000); // Har 30 second mein check karega

server.listen(PORT, () => {
  console.log(`Server Running on port: ${PORT}`);
});