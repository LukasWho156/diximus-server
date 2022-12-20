import express from 'express';
import createBot from '../games/create-bot.js';

import Game from '../games/game.js';

const testRouter = (gameDB) => {

    const router = express.Router();

    router.post('/createbot', (req, res) => {
        console.log(req.body);
        createBot(req.body.gameId).then(data => res.send(data))
    });

    return router;

}

export default testRouter