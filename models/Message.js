const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Recipient is not required because a regular user's message is always to the admin
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);

