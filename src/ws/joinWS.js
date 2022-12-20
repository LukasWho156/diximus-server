import Game from "../games/game.js";
import Player from "../games/player.js";
import checkValidity from "./checkValidity.js";

/**
 * All websocket functionality relating to before and after the game.
 * 
 * @param {object} gameDB the game database object, must contain .get and .set methods.
 * @param {object} io the websocket server
 * @param {object} socket the websocket connection
 */
const joinWS = (gameDB, io, socket) => {

    /**
     * try to join a game.
     */
    socket.on('join', (data) => {
        const game = gameDB.get(data.gameId);
        if(game?.state !== 'open') {
            socket.emit('joinresponse', {success: false});
            return;
        }
        const player = new Player(data.player.name, data.player.avatar)
        if(!game.join(player)) {
            socket.emit('joinresponse', {success: false});
            return;
        }
        socket.join(data.gameId);
        socket.game = game;
        socket.player = player;
        socket.emit('joinresponse', {success: true, gameId: data.gameId, playerId: player.id, privateId: player.privateId});
        io.to(data.gameId).emit('playerresponse', {players: game.players});
    });

    /**
     * reconnect to a game after the socket reconnects.
     */
    socket.on('reconnect', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, ["open", "running"]);
        if(!valid) {
            socket.emit('reconnectresponse', {success: false});
            return
        }
        socket.join(data.gameId);
        socket.game = valid.game;
        socket.player = valid.game.getPlayer(data.playerId);
        if(socket.player) socket.player.disconnected = false;
        socket.emit('reconnectresponse', {success: true});
        io.to(data.gameId).emit('playerresponse', {players: valid.game.players});
    });

    /**
     * try to start the game.
     */
    socket.on('startgame', async (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "open");
        if(!valid) return;
        if(!data.noRounds || !data.selectedSets) return;
        const okay = await valid.game.start(Number.parseInt(data.noRounds), data.selectedSets);
        if(!okay) return;
        io.to(data.gameId).emit('gamestarted');
    });

    /**
     * try to create a new game with the same game id and players
     */
    socket.on('restartgame', async (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "finished");
        if(!valid) return;
        const game = new Game(data.gameId);
        valid.game.players.forEach(player => {
            game.join(new Player(player.name, player.avatar, player.id));
        })
        gameDB.set(data.gameId, game);
        console.log(`Created game ${data.gameId}`);
        io.to(data.gameId).emit('gamerestarted');
    })

};

export default joinWS;