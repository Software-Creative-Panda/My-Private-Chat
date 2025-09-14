    require('dotenv').config();
    const express = require('express');
    const http = require('http');
    const mongoose = require('mongoose');
    const cors = require('cors');
    const { Server } = require("socket.io");
    const User = require('./models/User'); // We will create this model

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static('public')); // Serve frontend files

    // API Routes
    app.use('/api/auth', require('./routes/auth'));

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // --- Database Connection ---
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("MongoDB connected successfully."))
        .catch(err => console.error("MongoDB connection error:", err));

    const adminUserId = 'admin-james'; // A static ID for James/Admin

    // --- Socket.IO Real-time Logic ---
    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);
        const userId = socket.handshake.query.userId;
        socket.join(userId); // Each user joins a room named after their ID

        // Admin joins a special room to get all messages
        if (userId === adminUserId) {
            socket.join('admin-room');
        }

        socket.on('sendMessage', (data) => {
            const { senderId, receiverId, message } = data;
            // Send message to the receiver's room
            io.to(receiverId).emit('receiveMessage', { senderId, message });
            // Also send message to the admin's room so James can see it
            io.to('admin-room').emit('receiveMessage', { senderId, message });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    // --- API to get all users for the admin ---
    app.get('/api/users', async (req, res) => {
        try {
            // In a real app, you would protect this route
            const users = await User.find({ isAdmin: false }).select('-password');
            res.json(users);
        } catch (error) {
            res.status(500).send('Server error');
        }
    });


    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
