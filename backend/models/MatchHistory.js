const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    gameType: { type: String, required: true }, // e.g., 'CARO', 'SNAKE'
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null if draw
    details: { type: Object, default: {} }, // extra details (e.g., scores, room settings)
}, { timestamps: true });

module.exports = mongoose.model('MatchHistory', matchSchema);
