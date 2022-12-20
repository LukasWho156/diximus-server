import express from "express";

import Avatar from "../avatars/avatar.js";
import Card from "../models/card.js";
import Deck from "../models/deck.js";
import "../models/license.js";

/**
 * Return a router that handles other http requests.
 * 
 * @param {string} __dirname the base dirname of the server
 * @returns {express.Router} an express router object 
 */
const apiRouter = (__dirname) => {

    const router = express.Router();

    /**
     * Return an avatar image based on the given parameters
     */
    router.get('/avatar/:eyes/:hair/:accessory/:color', async (req, res) => {
        const avatar = new Avatar(req.params.eyes, req.params.hair, req.params.accessory, req.params.color);
        await avatar.generateData();
        res.type('png');
        res.send(avatar.imageData);
    });

    /**
     * Return the card image with the given id
     */
    router.get('/card/:id', async (req, res) => {
        try {
            const card = await Card.findById(req.params.id);
            res.sendFile(`${__dirname}/images/cards/${card.file}`);
        } catch(error) {
            console.error(error);
            res.send('unknown');
            return;
        }
    })

    /**
     * Return all available card sets, including the number of cards in them.
     */
    router.get('/sets', async(req, res) => {
        const sets = await Deck.find({}).exec();
        const promises = [];
        for(const set of sets) {
            promises.push(Card.countDocuments({deck: set.id}).exec().then(data => {
                const augmented = {...set._doc, noCards: data};
                return augmented;
            }));
        }
        const augmentedSets = await Promise.all(promises);
        res.send(augmentedSets);
    })

    /**
     * Return all cards within a given gallery, including all card information
     */
    router.get('/gallery/:id', async (req, res) => {
        try {
            const cards = await Card.find({deck: req.params.id}).populate('license');
            const deck = await Deck.findById(req.params.id);
            res.send({name: deck.name, cards: cards});
        } catch(err) {
            console.error(err);
            res.send([]);
        }
    })

    return router;

}

export default apiRouter;