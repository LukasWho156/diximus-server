import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
    room: String,
    totalTurns: Number,
    currentTurn: Number,
    finished: Boolean,
    activePlayer: String,
    lastActivity: Date,
    remainingCards: [{
        cardId: String,
    }],
    players: [{
        playerId: String,
        privateId: String,
        name: String,
        avatar: {
            eyes: Number,
            hair: Number,
            accessory: Number,
            color: Number,
        },
        handCards: [{
            cardId: String,
        }],
        score: {
            total: Number,
            throughGoodHints: Number,
            throughGoodCards: Number,
            throughGoodGuesses: Number,
        },
        guesses: [{
            playerId: String,
            amount: Number,
        }]
    }]
});

const DatabaseGame = mongoose.model("Game", GameSchema);
export default DatabaseGame;