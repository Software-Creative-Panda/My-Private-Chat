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

// Protected route to get users (only for admin)
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        // Find all users that are not admins
        const users = await User.find({ isAdmin: false }).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Route to get chat history
app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = req.params.userId;

        if (req.user.isAdmin) {
             // Admin fetching chat with a specific user
            const messages = await Message.find({
                $or: [
                    { senderId: currentUserId, recipientId: otherUserId },
                    { senderId: otherUserId, recipientId: currentUserId }
                ]
            }).sort({ timestamp: 1 });
            res.json(messages);
        } else {
            // Regular user fetching chat with admin
            const admin = await User.findOne({ isAdmin: true });
            if (!admin) return res.json([]);
            
            const messages = await Message.find({
                 $or: [
                    { senderId: currentUserId, recipientId: admin._id },
                    { senderId: admin._id, recipientId: currentUserId }
                ]
            }).sort({ timestamp: 1 });
            res.json(messages);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- Socket.IO Logic ---
const onlineUsers = new Map();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
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

    // Notify admin that a user is online
    const admin = await User.findOne({ isAdmin: true });
    if (admin) {
        const adminSocketId = onlineUsers.get(admin._id.toString());
        if (adminSocketId) {
            io.to(adminSocketId).emit('userStatus', { userId: socket.user.id, online: true });
        }
    }
    
    // Send the list of currently online users to the admin if they connect
    if(socket.user.isAdmin) {
        socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }


    socket.on('sendMessage', async (msg) => {
        try {
            const { recipientId, text } = msg;
            const senderId = socket.user.id;
            let finalRecipientId = recipientId;

            // If a regular user sends a message, it's always for the admin
            if (!socket.user.isAdmin) {
                const adminUser = await User.findOne({ isAdmin: true });
                if (!adminUser) return; // Should not happen
                finalRecipientId = adminUser._id;
            }

            // Save message to database
            const message = new Message({
                senderId,
                recipientId: finalRecipientId,
                text,
            });
            await message.save();

            // Send message to recipient if they are online
            const recipientSocketId = onlineUsers.get(finalRecipientId.toString());
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receiveMessage', {
                    ...message.toObject()
                });
            }

        } catch (error) {
            console.error("Error saving or sending message:", error);
        }
    });

    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user.username}`);
        onlineUsers.delete(socket.user.id);
        
        // Notify admin that a user is offline
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

