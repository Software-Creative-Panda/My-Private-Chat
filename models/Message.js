const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    from: {
        type: String, // Can be user ID or 'admin-james'
        required: true
    },
    to: {
        type: String, // Can be user ID or 'admin-james'
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, { timestamps: true }); // Timestamps automatically add createdAt and updatedAt

module.exports = mongoose.model('Message', MessageSchema);
