const express = require("express");
const http = require("http");
const { Server } = require("socket.io"); // Socket.io class import ki
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);

// YAHAN FIX HAI: 'io' ko ek hi baar declare kiya settings ke saath
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100MB limit (Mobile photo fix)
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// ================= DB =================
const dbURI =
  "mongodb+srv://Sanskar:Sudhi%4024@cluster0.uawz0db.mongodb.net/chatApp?retryWrites=true&w=majority";

mongoose
  .connect(dbURI, {
    serverSelectionTimeoutMS: 5000,
    family: 4,
  })
  .then(() => console.log("MongoDB Connected ✔"))
  .catch((err) => console.log("DB Error:", err.message));

// ================= MODEL =================
const MessageSchema = new mongoose.Schema({
  id: String,
  sender: String,
  text: String,
  file: String,
  seen: { type: Boolean, default: false },
  seenAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", MessageSchema);

// ================= APP =================
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ================= STATE =================
let onlineUsers = {};
let lastSeen = {};
let userSocketMap = {}; // 🔥 IMPORTANT FIX

// ================= SOCKET =================
// 3. Phir iske niche aapka connection logic:
io.on("connection", async (socket) => {
  console.log("User Connected:", socket.id);
  // ... baaki chat ka code
});

  // ================= USER ONLINE =================
  socket.on("userOnline", (username) => {
    if (!username) return;

    const name = username.toLowerCase();
    socket.username = name;

    onlineUsers[name] = true;
    userSocketMap[name] = socket.id; // 🔥 FIX
    delete lastSeen[name];

    io.emit("onlineUsers", { onlineUsers, lastSeen });
  });

  // ================= SEND MESSAGE =================
  socket.on("sendMessage", async (data) => {
    const msg = await Message.create(data);
    io.emit("receiveMessage", msg);
  });

  // ================= TYPING =================
  socket.on("typing", () => {
    if (!socket.username) return;

    socket.broadcast.emit("typing", socket.username);

    clearTimeout(socket.typingTimer);
    socket.typingTimer = setTimeout(() => {
      socket.broadcast.emit("typing", null);
    }, 1200);
  });

  // ================= SEEN =================
  socket.on("messageSeen", async (data) => {
    const msg = await Message.findOne({ id: data.messageId });

    if (!msg || msg.seen) return;

    msg.seen = true;
    msg.seenAt = new Date();
    await msg.save();

    io.emit("messageSeenUpdate", {
      messageId: data.messageId,
      time: msg.seenAt.toLocaleTimeString(),
    });
  });

  // ================= CALL SYSTEM (FIXED) =================

  socket.on("audioCall", (data) => {
    const targetSocket = userSocketMap[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("audioCallIncoming", {
        from: data.from,
      });
    }
  });

  socket.on("videoCall", (data) => {
    const targetSocket = userSocketMap[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("videoCallIncoming", {
        from: data.from,
      });
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    if (!socket.username) return;

    const name = socket.username;

    delete onlineUsers[name];
    delete userSocketMap[name]; // 🔥 FIX
    lastSeen[name] = Date.now();

    io.emit("onlineUsers", { onlineUsers, lastSeen });
  });

// ================= AUTO DELETE =================
setInterval(async () => {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  const msgs = await Message.find({
    seen: true,
    seenAt: { $lte: tenMinAgo },
  });

  for (let msg of msgs) {
    await Message.deleteOne({ id: msg.id });
    io.emit("deleteMessage", msg.id);
  }
}, 60 * 1000);

// ================= START =================
server.listen(PORT, () => {
  console.log(`Server Running: http://localhost:${PORT}`);
});