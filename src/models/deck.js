import mongoose from "mongoose";

const DeckSchema = new mongoose.Schema({
    name: String,
    artist: String,
    description: {}
});

const Deck = mongoose.model('Deck', DeckSchema);
export default Deck