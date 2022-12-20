import mongoose from "mongoose";

const CardSchema = new mongoose.Schema({
    title: String,
    file: String,
    deck: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deck',
    },
    artist: String,
    year: String,
    license: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'License',
    },
});

const Card = mongoose.model('Card', CardSchema);
export default Card