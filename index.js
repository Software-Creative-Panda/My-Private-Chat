require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require("socket.io");

// Import models and middleware
const User = require('./models/User');
const Message = require('./models/Message');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const adminUserId = 'admin-james'; // A static ID for James/Admin
const onlineUsers = new Set();

// --- Socket.IO Real-time Logic ---
io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
    
    socket.join(userId); // Each user joins a room named after their ID
    if(userId !== adminUserId) {
        onlineUsers.add(userId);
    }

    // Let admin know who is online
    io.to(adminUserId).emit('updateOnlineUsers', Array.from(onlineUsers));

    socket.on('sendMessage', async (data) => {
        const { senderId, receiverId, message } = data;
        
        // Save message to database
        const newMessage = new Message({
            from: senderId,
            to: receiverId,
            message: message
        });
        await newMessage.save();
        
        const messageData = { 
            ...newMessage.toObject(),
             senderId // Include senderId for frontend logic
        };

        // Send message to the receiver's room
        io.to(receiverId).emit('receiveMessage', messageData);
        // Also send message to the sender's room (so it appears on their screen)
        io.to(senderId).emit('receiveMessage', messageData);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        if(userId !== adminUserId) {
            onlineUsers.delete(userId);
        }
        // Let admin know who is online
        io.to(adminUserId).emit('updateOnlineUsers', Array.from(onlineUsers));
    });
});

// --- API to get all users for the admin (now protected) ---
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// --- API to get chat history ---
app.get('/api/messages/:userId', async (req, res) => {
    try {
        // In a real app, you would add authentication here as well
        const { userId } = req.params;
        const messages = await Message.find({
            $or: [
                { from: userId, to: adminUserId },
                { from: adminUserId, to: userId }
            ]
        }).sort({ createdAt: 'asc' });
        res.json(messages);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

