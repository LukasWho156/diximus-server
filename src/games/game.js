import mongoose from "mongoose";
import Card from "../models/card.js";
import DatabaseGame from "../models/database-game.js";
import Player from "./player.js";

/**
 * A simple implementation of the Fisher-Yates shuffle.
 * 
 * @param {any[]} array An array of elements.
 * @returns {any[]} A random permutation of the original array.
 */
const shuffle = (array) => {
    const newArray = [];
    while(array.length > 0) {
        const index = Math.floor(Math.random() * array.length);
        newArray.push(array[index]);
        array.splice(index, 1);
    }
    return newArray;
}

/**
 * This class contains all the game logic of a game. It's currently a little bloated,
 * perhaps.
 */
class Game {

    // A bunch of private fields
    _id; // the game's id (string)

    _players; // an array of Players
    _availableColors; // An array of color indexes not yet used by other players.
    _started; // has the game started? (bool)
    _finished; // has the game finished? (bool)

    _deck; // an array of the remaining cards {id: string}
    _turns; // the total number of turns (int)
    _currentTurn; // the current turn (int)

    _hint; // the card description given by the active player, or null if there is none (string)
    _chosenCards; // an array of cards given to the active player by the other players

    /**
     * the game's "sub-state" when running. Can be one of the following:
     * init: Game hasn't started yet, someone must go first
     * waitForHint: The active player hasn't given a card description yet
     * waitForCards: Not all other players have chosen a fitting card yet
     * waitForGuesses: Not all other players have chosen which card they think is the original one yet
     * evaluation: The turn is finished, show scores and wait for someone to start the next turn.
     */
    _runningState; 
    _activePlayerId; // The id of the active player (string)

    _dbGame; // A mongoose model to save to the database whenever a new turn start.

    /**
     * true if the game is already finished, otherwise false
     */
    get isFinished() {
        return this._finished;
    }

    /**
     * true if the game hasn't started yet, otherwise false
     */
    get isOpen() {
        return !this._started;
    }

    /**
     * The main game state. Can be one of the following:
     * 'open': The game hasn't started yet
     * 'running': The game is currently running
     * 'finished': The game has finished
     */
    get state() {
        if(this.isFinished) {
            return 'finished';
        }
        if(this.isOpen) {
            return 'open';
        }
        return 'running';
    }

    /**
     * Get information about the players in this game. Has the following fields:
     * name: the player's name
     * avatar: an object containing the player's avatar parameters
     * id: the player's id
     * admin: true if the player is the game's admin (the one who created it), otherwise false
     * active: true if the player is the currently active one, otherwise false
     * score: an object containing the player's score information
     * guesses: an object containing information about how often the player has chosen another player's card
     * pending: true if the player has to do something for the game state to advance, otherwise false
     */
    get players() {
        return this._players.map((player, i) => {
            return {
                name: player.name,
                avatar: player.avatar,
                id: player.id,
                admin: (i === 0),
                active: player.id === this._activePlayerId,
                score: player.score,
                guesses: player.guesses,
                pending: player.pending,
                disconnected: player.disconnected,
            }
        });
    }

    /**
     * Information about the game's current "sub-state". Contains the following information:
     * state: the running state, see above
     * activePlayer: the currently active player's id
     * currentTurn: the current turn
     */
    get runningState() {
        return {
            state: this._runningState,
            activePlayer: this._activePlayerId,
            currentTurn: this._currentTurn,
        }
    }

    /**
     * Returns the total amount of turns that shall be played
     */
    get totalTurns() {
        return this._turns;
    }

    /**
     * The hint given by the currently active player, or null if none has been given yet
     */
    get hint() {
        return this._hint;
    }

    /**
     * An array of cards given by the non-active players that fit the hint as well as possible.
     * To prevent information leakage, only return the card's ids during the guessing phase.
     */
    get chosenCards() {
        return this._chosenCards.map(card => ({ id: card.id }));
    }

    /**
     * Same as above, but this time return all information. Used during the evaluation phase.
     * Contains the following information:
     * id: the card's id
     * owner: the id of the player who contributed this card
     * guessedBy: an array of player ids who guessed this card to be the correct one.
     */
    get chosenCardsFull() {
        return this._chosenCards;
    }

    /**
     * Create a new game with the given id and set up some basic variables.
     * 
     * @param {string} id The game's id.
     */
    constructor(id) {
        this._players = [];
        this._started = false;
        this._finished = false;
        this._id = id;
        this._chosenCards = [];
        this._availableColors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }

    getPlayer(playerId) {
        return this._players.find(e => e.id === playerId);
    }

    /**
     * Try to add another player to the game.
     * 
     * @param {Player} player The player supposed to join.
     * @returns true if the player successfully joined the game, otherwise false.
     */
    join(player) {
        // check if the player is allowed to join
        if(!this.isOpen) return false; // make sure the game hasn't started yet.
        if(this._players.length >= 10) return false; // max amount of players = 10
        // pick a random color from the remaining pool
        const color = Math.floor(Math.random() * this._availableColors.length);
        player.avatar.color = this._availableColors[color];
        this._availableColors.splice(color, 1);
        // add the player to the game
        this._players.push(player);
        return true;
    }

    /**
     * Try to start the game.
     * 
     * @param {number} rounds How many turns should be played in total.
     * @param {string[]} sets The ids of the card sets that shall be used for play.
     * @returns true if the game successfully started, otherwise false. Note that this is a sanity check and
     * it should be impossible fail this with the current (untempered) frontend.
     */
    async start(rounds, sets) {
        // you can't start a game twice
        if(this._started) return false;
        this._started = true;
        this._turns = rounds;
        this._currentTurn = 0;
        // get a random sample of cards that is enough to play the given amount of turns.
        const ids = sets.map(e => mongoose.Types.ObjectId(e))
        this._deck = (await Card.aggregate([{$match: {deck: {$in: ids}}}]).sample(this._players.length * (5 + rounds)))
            .map(element => ({id: element._id.toString()}));
        // if, for some reason, there are not enough cards, abort.
        if(this._deck.length < (this._players.length * (5 + rounds))) return false;
        // all players draw six cards at the beginning of the game.
        for(const player of this._players) {
            for(let i = 0; i < 6; i++) {
                player.drawCard(this);
            }
            player.setupGuesses(this._players);
        }
        // now that everything's working, save the game in the database for the first time and wait for further action.
        this.initialSave();
        this._runningState = 'init';
        return true;
    }

    /**
     * Someone needs to go first, then the game can start.
     * 
     * @param {string} playerId the player who wants to go first
     * @returns true if the player may go first, otherwise false
     */
    iWantToGoFirst(playerId) {
        // some sanity checks
        if(!this.findPlayer(playerId)) return false;
        if(this._runningState !== 'init') return false;
        // start the game's first turn
        this.startNewTurn(playerId);
        return true;
    }

    /**
     * Start a new turn and save the game to the database. Only called from within the class.
     * 
     * @param {string} activePlayer This turn's active player's id
     */
    startNewTurn(activePlayer) {
        this._runningState = 'waitForHint';
        this._currentTurn++;
        this._activePlayerId = activePlayer;
        this.saveGame();
        for(const player of this._players) {
            player.resetTurnScore();
            player.pending = true;
        }
        this._chosenCards = [];
        this._hint = '';
    }

    /**
     * As the currently active player, choose a card and describe it.
     * 
     * @param {string} playerId The hint giver's id
     * @param {Object} hint Contains the card (.card) and its description (.hint)
     * @returns true if successful, otherwise false
     */
    giveHint(playerId, hint) {
        // Quite a few sanity checks
        if(!hint) return false;
        if(this._activePlayerId != playerId) return false;
        if(this._masterCard) return false;
        if(this._runningState !== 'waitForHint') return false;
        // One last sanity check as we try to add the hint giver's card to the list of chosen cards
        if(!this.giveCard(playerId, hint.card, 'waitForHint')) return false;
        // Great, we can move on to the next phase of the turn!
        this._runningState = 'waitForCards';
        this._hint = hint.hint;
        return true;
    }

    /**
     * Try to move a card from a player's hand to the pool of chosen cards.
     * 
     * @param {string} playerId the card giver's id
     * @param {string} card the card's id
     * @param {string} condition which running state the game must currently be in in order for this to succeed.
     * @returns true if successful, otherwise false
     */
    giveCard(playerId, card, condition) {
        // sanity checks
        if(this._runningState !== (condition ?? 'waitForCards')) return false;
        const player = this.findPlayer(playerId);
        if(!player) return false;
        if(!player.pending) return false;
        if(!player.hasCard(card)) return false;
        // add the card to the array of chosen cards and remove it from the player's hand
        this._chosenCards.push({id: card, owner: playerId, guessedBy: []})
        player.removeCard(card);
        // for now, the player has done their business
        player.pending = false;
        return true;
    }

    /**
     * Check if all players have contributed their card. if this is the case, continue to the
     * next phase of the turn.
     * 
     * @returns true if all players are done, otherwise false
     */
    checkLastCard() {
        if(this._runningState !== 'waitForCards') return false; //sanity check
        // do we still wait for anyone to contribute their card?
        for(const player of this._players) {
            if(player.pending) return false;
        }
        // no? Very well, shuffle the chosen cards to make sure people can't tell the correct card by its position
        // and continue to the next phase of the turn.
        this._chosenCards = shuffle(this._chosenCards);
        for(const player of this._players) {
            if(player.id !== this._activePlayerId) player.pending = true;
        }
        this._runningState = 'waitForGuesses';
        return true;
    }

    /**
     * A player guesses that a certain card is the correct one.
     * 
     * @param {string} playerId the guesser's id
     * @param {string} card the id of the card guessed by the player.
     * @returns true if successful, otherwise false
     */
    guess(playerId, card) {
        // I love sanity checks!
        if(this._runningState !== 'waitForGuesses') return false;
        const player = this.findPlayer(playerId);
        if(!player) return false;
        if(!player.pending) return false;
        const guessedCard = this._chosenCards.find(e => e.id === card);
        if(!guessedCard) return false;
        if(guessedCard.owner === playerId) return false;
        // okay, seems like we're good to go. Register the guess.
        guessedCard.guessedBy.push(playerId);
        player.pending = false;
        return true;
    }

    /**
     * Similarily to the checkLastCard method, check if all players have placed their guesses
     * and if that is the case, go to the next phase of the turn.
     * 
     * @returns true if all players are done, otherwise false.
     */
    checkLastGuess() {
        if(this._runningState !== 'waitForGuesses') return false;
        for(const player of this._players) {
            if(player.pending) return false;
        }
        this._runningState = 'evaluation';
        return true;
    }

    /**
     * Reset the game variables that were set during the turn, then move on to the next one.
     * 
     * @returns true if successful, otherwise false
     */
    prepareForNextTurn() {
        if(this._runningState !== 'evaluation') return false; // sanity check
        // is there even a next turn or has the game finished?
        if(this._currentTurn >= this._turns) {
            this.finishGame();
            return false;
        }
        // all players need to draw another card to get back to six.
        for(const player of this._players) {
            player.drawCard(this);
        }
        // the player next to the currently active player becomes the new active player
        let activeIndex = this._players.findIndex(e => e.id === this._activePlayerId);
        activeIndex++;
        if(activeIndex >= this._players.length) activeIndex = 0;
        // that was fun! Let's have another turn!
        this.startNewTurn(this._players[activeIndex].id);
        return true;
    }

    /**
     * Calculate how many points each player scored this round and update their scoreboards.
     * This method is quite a mess currently, but it works.
     */
    calculateScore() {
        const activePlayer = this.findPlayer(this._activePlayerId);
        // evaluate the scores card-wise
        for(const card of this._chosenCards) {
            // case A: the card is correct
            if(card.owner === this._activePlayerId) {
                // case A.1: nobody guessed the correct card. All other players get 2 points
                if(card.guessedBy.length === 0) {
                    for(const player of this._players) {
                        if(player.id === this._activePlayerId) continue;
                        player.awardPoints(2)
                    }
                    continue;
                }
                // case A.2: some, but not all players guessed the correct card. The active player
                // gets 3 points, as well as everyone who guessed the correct card.
                if(card.guessedBy.length < this._players.length - 1) {
                    activePlayer.awardPoints(3, 'throughGoodHints');
                    for(const playerId of card.guessedBy) {
                        this.handleGuess(playerId, card.owner, 3, 0)
                    }
                    continue;
                }
                // case A.3: everyone guessed the correct card. Everyone but the active player gets 2 points
                for(const playerId of card.guessedBy) {
                    this.handleGuess(playerId, card.owner, 2, 0)
                }
                continue;
            }
            // case B: This is not the correct card. The card giver gets 1 point for everyone who guessed their card.
            for(const playerId of card.guessedBy) {
                this.handleGuess(playerId, card.owner, 0, 1)
            }
        }
    }

    /**
     * Award the points gained through a guess and update the crosstable containing information about who
     * guessed whose card how often.
     * 
     * @param {string} guesserId the id of the player who guessed the card
     * @param {string} ownerId the id of the player who gave the card
     * @param {number} guesserScore how many points shall be awarded to the guesser
     * @param {number} ownerScore how many points shall be awardet to the owner
     */
    handleGuess(guesserId, ownerId, guesserScore, ownerScore) {
        const guesser = this.findPlayer(guesserId);
        guesser.awardPoints(guesserScore, 'throughGoodGuesses');
        guesser.guess(ownerId);
        const owner = this.findPlayer(ownerId);
        owner.awardPoints(ownerScore, 'throughGoodCards');
    }

    /**
     * Finish the game.
     */
    finishGame() {
        this._finished = true;
        this.saveGame();
    }

    /**
     * Draw the top card of the deck (and remove it from the deck).
     * 
     * @returns the top card of the deck.
     */
    drawCard() {
        return this._deck.pop();
    }

    /**
     * Find a player by their id
     * 
     * @param {string} id the player's id
     * @returns the requested player, or null if not found
     */
    findPlayer(id) {
        return this._players.find(player => player.id === id);
    }

    /**
     * Extract the player information that should be stored in the database and return it
     * for all players. Quite probably needlessly complicated.
     * 
     * @returns an array of player information objects, ready to be stored in the database.
     */
    getDbPlayers() {
        const dbPlayers = [];
        for(const player of this._players) {
            const guesses = [];
            for(const key of Object.keys(player.guesses)) {
                guesses.push({
                    playerId: key,
                    amount: player.guesses[key],
                })
            }
            dbPlayers.push({
                playerId: player.id,
                privateId: player.privateId,
                name: player.name,
                avatar: player.avatar,
                handCards: player.cards.map(e => ({ cardId: e.id })),
                score: {
                    total: player.score.total,
                    throughGoodHints: player.score.throughGoodHints,
                    throughGoodCards: player.score.throughGoodCards,
                    throughGoodGuesses: player.score.throughGoodGuesses,
                },
                guesses: guesses,
            })
        }
        return dbPlayers;
    }

    /**
     * Save the game to the database for the first time.
     */
    initialSave() {
        this._dbGame = new DatabaseGame({ room: this._id });
        this.saveGame();
    }

    /**
     * Save the game to the database.
     */
    saveGame() {
        console.log(`Saving game ${this._id} ...`);
        this._dbGame.activePlayer = this._activePlayerId;
        this._dbGame.totalTurns = this._turns;
        this._dbGame.currentTurn = this._currentTurn;
        this._dbGame.finished = this._finished;
        this._dbGame.remainingCards = this._deck.map(e => ({ cardId: e.id })),
        this._dbGame.lastActivity = new Date(),
        this._dbGame.players = this.getDbPlayers();
        this._dbGame.save().then(saved => {
            console.log(`Game ${this._id} successfully saved!`);
        }).catch(err => {
            console.error(`Error saving game ${this._id}`, err);
        });
    }

    /**
     * Create a new Game object from a database entry. Used to reload games when the server restarts / crashes / ...
     * 
     * @param {Object} dbEntry the database entry
     * @returns {Game} a Game object
     */
    static loadGame(dbEntry) {
        const game = new Game(dbEntry.room);
        game._started = true;
        game._turns = dbEntry.totalTurns;
        game._currentTurn = dbEntry.currentTurn;
        game._finished = dbEntry.finished;
        if(dbEntry.activePlayer) {
            game._activePlayerId = dbEntry.activePlayer;
            game._runningState = 'waitForHint';
        } else {
            game._runningState = 'init';
        }
        game._deck = dbEntry.remainingCards?.map(e => ({ id: e.cardId }));
        game._players = dbEntry.players?.map(dbPlayer => Player.load(dbPlayer));
        game._dbGame = dbEntry;
        return game;
    }

}

export default Game;