import express from 'express';
import { hri } from 'human-readable-ids';

import Game from '../games/game.js';

/**
 * Return a router that handles requests related to games.
 * 
 * @param gameDB The game database this router pulls games from. Must contain .get and .set methods.
 * @returns {express.Router} An express router object
 */
const gameRouter = (gameDB) => {

    const router = express.Router();

    /**
     * Create a new game. Returns the newly created game's id.
     */
    router.post('/create', async (req, res) => {
        let id;
        let okay = false;
        while(!okay) {
            id = hri.random();
            const game = gameDB.get(id);
            if(!game || game?.isDead) okay = true;
        }
        const game = new Game(id);
        gameDB.set(id, game);
        console.log(`Created game ${id}`);
        res.send({success: true, id: id});
    });

    /**
     * Get the current game state of the game with the given id.
     */
    router.get('/state/:id', async(req, res) => {
        const game = gameDB.get(req.params.id);
        res.send({state: game?.state ?? 'invalid'});
    });

    /**
     * Get the players that have joined the game with the given id.
     */
    router.get('/players/:id', async(req, res) => {
        const game = gameDB.get(req.params.id);
        if(!game) {
            res.send({success: false});
            return;
        }
        res.send({succes: true, players: game.players, maxPlayers: game.maxPlayers});
    });

    return router;

}

export default gameRouter;