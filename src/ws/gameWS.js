import checkValidity from "./checkValidity.js";

/**
 * All websocket functionality relating to the gameplay itself.
 * 
 * @param {object} gameDB the game database object, must contain .get and .set methods.
 * @param {object} io the websocket server
 * @param {object} socket the websocket connection
 */
const gameWS = (gameDB, io, socket) => {

    /**
     * Request game info.
     */
    socket.on('getgameinfo', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        socket.emit('gameinforesponse', {success: true, totalTurns: valid.game.totalTurns});
        socket.emit('cardresponse', {success: true, cards: valid.player.cards});
        socket.emit('playerresponse', {success: true, players: valid.game.players});
        socket.emit('runningstatechanged', valid.game.runningState);
        socket.emit('hintgiven', valid.game.hint);
        if(valid.game.runningState.state === 'waitForGuesses') socket.emit('chosencardresponse', {success: true, cards: valid.game.chosenCards});
        if(valid.game.runningState.state === 'evaluation') socket.emit('chosencardresponse', {success: true, cards: valid.game.chosenCardsFull});
    })

    /**
     * Request info about the players in the game
     */
    socket.on('getplayers', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, ["running", "finished"]);
        if(!valid) {
            socket.emit('playerresponse', {success: false})
            return;
        }
        socket.emit('playerresponse', {success: true, players: valid.game.players});
    });

    /**
     * Request info about the player's hand cards
     */
    socket.on('gethandcards', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        socket.emit('cardresponse', {success: true, cards: valid.player.cards});
    })

    /**
     * Request to go first.
     */
    socket.on('iwanttogofirst', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        valid.game.iWantToGoFirst(data.playerId);
        io.to(data.gameId).emit('runningstatechanged', valid.game.runningState);
        io.to(data.gameId).emit('playerresponse', {success: true, players: valid.game.players})
    });

    /**
     * Request to give a hint.
     */
    socket.on('givehint', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        if(!valid.game.giveHint(data.playerId, data.hint)) return;
        socket.emit('cardresponse', {success: true, cards: valid.player.cards});
        io.to(data.gameId).emit('hintgiven', valid.game.hint);
        io.to(data.gameId).emit('playerresponse', {success: true, players: valid.game.players})
        io.to(data.gameId).emit('runningstatechanged', valid.game.runningState);
    });

    /**
     * Request to give a card fitting the given hint.
     */
    socket.on('givecard', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        if(!valid.game.giveCard(data.playerId, data.card)) return;
        socket.emit('cardresponse', {success: true, cards: valid.player.cards});
        const check = valid.game.checkLastCard();
        io.to(data.gameId).emit('playerresponse', {success: true, players: valid.game.players});
        if(!check) return;
        io.to(data.gameId).emit('chosencardresponse', {success: true, cards: valid.game.chosenCards});
        io.to(data.gameId).emit('runningstatechanged', valid.game.runningState);
    });

    /**
     * Request to guess a certain card to be the correct one.
     */
    socket.on('guess', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        if(!valid.game.guess(data.playerId, data.card)) return;
        const check = valid.game.checkLastGuess();
        if(!check) {
            io.to(data.gameId).emit('playerresponse', {success: true, players: valid.game.players});
            return;
        }
        valid.game.calculateScore();
        io.to(data.gameId).emit('playerresponse', {success: true, players: valid.game.players});
        io.to(data.gameId).emit('chosencardresponse', {success: true, cards: valid.game.chosenCardsFull});
        io.to(data.gameId).emit('runningstatechanged', valid.game.runningState);
    });

    /**
     * Request to start the next turn.
     */
    socket.on('nextturn', (data) => {
        const valid = checkValidity(gameDB, data.gameId, data.playerId, data.privateId, "running");
        if(!valid) return;
        if(!valid.game.prepareForNextTurn()) {
            if(valid.game.isFinished) io.to(data.gameId).emit('gamefinished');
            return;
        }
        io.to(data.gameId).emit('playerresponse', {success: true, players: valid.game.players});
        io.to(data.gameId).emit('chosencardresponse', {success: true, cards: []});
        io.to(data.gameId).emit('hintgiven', '');
        io.to(data.gameId).emit('runningstatechanged', valid.game.runningState);
    })

}

export default gameWS;