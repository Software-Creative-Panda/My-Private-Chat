const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// --- Registration Route ---
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }
        
        // Simple validation
        if (password.length < 6) {
             return res.status(400).json({ msg: 'Password must be at least 6 characters' });
        }

        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        
        // Check if this is the first user, or username is 'james', make them admin
        const isAdmin = (await User.countDocuments({})) === 0 || username.toLowerCase() === 'james';
        
        user = new User({ username, password, isAdmin });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Login Route ---
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create and return a JWT with username included
        const payload = { 
            user: { 
                id: user.id, 
                isAdmin: user.isAdmin,
                username: user.username // <-- Important for welcome message
            } 
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

