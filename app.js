import bodyParser from 'body-parser';
import * as url from 'url';

import express from 'express';
import * as enforce from 'express-sslify';
import serveFavicon from 'serve-favicon';
import { createServer } from 'http';
import cors from 'cors';
import { Server as WSServer } from 'socket.io';
import mongoose from 'mongoose';
import * as path from 'path';

import Game from './src/games/game.js';

import gameRouter from './src/routes/gameRouter.js';
import apiRouter from './src/routes/apiRouter.js';
import testRouter from './src/routes/testRouter.js';
import joinWS from './src/ws/joinWS.js';
import gameWS from './src/ws/gameWS.js';

import DatabaseGame from './src/models/database-game.js';

// define some constants
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const port = process.env.PORT ?? 3000;
const dbString = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/diximus';

// set up express
const app = express();

console.log(process.env.NODE_ENV)

// for the heroku app, redirect http requests to https
if(process.env.NODE_ENV === 'production') {
    console.log('Using https enforcing');
    app.use(enforce.HTTPS({ trustProtoHeader: true }));
}

// some more middleware
app.use(cors({
    origin: process.env.CORS_ADRESS ?? '*',
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

if(process.env.NODE_ENV === 'production') app.use(serveFavicon(path.join(__dirname, 'images', 'favicon.ico')));

// set up database
console.log('Connecting to database ...')
try {
    await mongoose.connect(dbString)
} catch(err) {
    console.error(err);
    process.exit(5);
}

// restore games
console.log('Restore running games ...');
const gameDB = new Map();
const msPerDay = 1000 * 60 * 60 * 24;
const yesterday = new Date();
yesterday.setTime(yesterday.getTime() - msPerDay);
DatabaseGame.find({lastActivity: { $gte: yesterday.toISOString() }}).then(data => {
    for(const entry of data) {
        gameDB.set(entry.room, Game.loadGame(entry));
        console.log(`Restored game ${entry.room}`);
    }
}).catch(err => console.error(err));

// delete old games
console.log('Clean up old games ...')
DatabaseGame.deleteMany({lastActivity: { $lt: yesterday }}).then(data => {
    console.log(`Deleted ${data.deletedCount} games.`);
}).catch(err => console.error(err))

// set up WebSocket server
const server = createServer(app);
const io = new WSServer(server, {
    cors: {
        origin: process.env.CORS_ADRESS ?? '*',
    }
});

if(process.env.NODE_ENV === 'test') {
    console.log('Using testing api');
    app.use('/api/test', testRouter(gameDB));
}
// game api
app.use('/api/game', gameRouter(gameDB));
// other api
app.use('/api', apiRouter(__dirname));

// The static React folder, containing css and stuff
app.use('/static', express.static(path.join(__dirname, './build//static')));
// The React app (always return the index.html file, other stuff is handled by the React Router)
app.get('*', function(req, res) {
    res.sendFile('index.html', {root: path.join(__dirname, './build/')});
});

// init websocket connection
io.on('connection', (socket) => {

    console.log(`Socket ${socket.id} connected`);

    joinWS(gameDB, io, socket);
    gameWS(gameDB, io, socket);
    
    socket.on('disconnect', () => {
        if(socket.player) socket.player.disconnected = true;
        setTimeout(() => emitDisconnect(io, socket), 5000);
        console.log(`Socket ${socket.id} disconnected`);
    });

});

const emitDisconnect = (io, socket) => {
    if(!socket.player?.disconnected) return;
    if(socket.game) io.to(socket.game._id).emit('playerresponse', {players: socket.game.players});
}

// finally, start listening
server.listen(port, () => {
    console.log(`Diximus server is listening on port ${port}!`)
});