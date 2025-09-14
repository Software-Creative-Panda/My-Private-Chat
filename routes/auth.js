    const express = require('express');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const router = express.Router();

    // --- Registration ---
    router.post('/register', async (req, res) => {
        const { username, password } = req.body;
        try {
            let user = await User.findOne({ username });
            if (user) return res.status(400).json({ msg: 'User already exists' });

            const isAdmin = username.toLowerCase() === 'james'; // Make 'james' the admin
            user = new User({ username, password, isAdmin });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            res.status(201).json({ msg: 'User registered successfully' });
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });

    // --- Login ---
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await User.findOne({ username });
            if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

            const payload = {
                user: {
                    id: user.id,
                    username: user.username,
                    isAdmin: user.isAdmin
                }
            };

            jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
                if (err) throw err;
                res.json({ token });
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    module.exports = router;
    
