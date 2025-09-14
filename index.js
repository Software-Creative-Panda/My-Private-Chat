require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Message = require('./models/Message');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));

app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        let otherUserId = req.params.userId;
        let adminId = null;

        const admin = await User.findOne({ isAdmin: true });
        if (!admin) {
            return res.status(404).json({ msg: 'Admin account not found' });
        }
        adminId = admin._id;

        if (req.user.isAdmin) {
             otherUserId = req.params.userId;
        } else {
            otherUserId = adminId;
        }
       
        const messages = await Message.find({
            $or: [
                { senderId: currentUserId, recipientId: otherUserId },
                { senderId: otherUserId, recipientId: currentUserId }
            ]
        }).sort({ timestamp: 1 });
        
        res.json({ messages, adminId: adminId.toString() });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Socket.IO Logic ---
const onlineUsers = new Map();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded.user;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    onlineUsers.set(socket.user.id, socket.id);

    const admin = await User.findOne({ isAdmin: true });
    if (admin) {
        const adminSocketId = onlineUsers.get(admin._id.toString());
        if (adminSocketId) {
            io.to(adminSocketId).emit('userStatus', { userId: socket.user.id, online: true });
        }
    }
    
    if(socket.user.isAdmin) {
        socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }

    socket.on('sendMessage', async (msg) => {
        try {
            const { recipientId, text } = msg;
            const senderId = socket.user.id;
            let finalRecipientId = recipientId;

            if (!socket.user.isAdmin) {
                const adminUser = await User.findOne({ isAdmin: true });
                if (!adminUser) return;
                finalRecipientId = adminUser._id;
            }

            const message = new Message({ senderId, recipientId: finalRecipientId, text });
            const savedMessage = await message.save();

            const senderSocketId = onlineUsers.get(senderId.toString());
            const recipientSocketId = onlineUsers.get(finalRecipientId.toString());

            if (senderSocketId) {
                io.to(senderSocketId).emit('receiveMessage', savedMessage);
            }
            if (recipientSocketId && recipientSocketId !== senderSocketId) {
                io.to(recipientSocketId).emit('receiveMessage', savedMessage);
            }

        } catch (error) {
            console.error("Error in sendMessage:", error);
        }
    });

    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user.username}`);
        onlineUsers.delete(socket.user.id);
        
        const admin = await User.findOne({ isAdmin: true });
        if (admin) {
            const adminSocketId = onlineUsers.get(admin._id.toString());
            if (adminSocketId) {
                io.to(adminSocketId).emit('userStatus', { userId: socket.user.id, online: false });
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

