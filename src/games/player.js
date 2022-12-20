import { v4 as uuid } from 'uuid';

class Player {

    name;           // the player's (nick)name (string)
    avatar;         // the player's avatar configuration (object)
    id;             // the player's unique id, usually generated (string)
    privateId;      // the player's private unique id that is never sent to other players (string)
    score;          // the player's various scores (object)
    cards;          // the player's hand cards (object[])
    pending;        // true if the player needs to perform an action, otherwise false (boolean)
    disconnected;   // true if the player is disconnected, otherwise false (boolean)

    /**
     * Create a new player
     * 
     * @param {string} name  The player's (nick)name
     * @param {object} avatar The player's avatar configuration, should contain eyes, hair, accessory and color fields
     * @param {string} id? The player's unique id. If omitted, a uuid is automatically generated.
     */
    constructor(name, avatar, id, privateId) {
        this.name = name;
        this.avatar = avatar;
        this.id = id ?? uuid();
        this.privateId = privateId ?? uuid();
        this.score = {
            total: 0,
            thisTurn: 0,
            throughGoodHints: 0,
            throughGoodGuesses: 0,
            throughGoodCards: 0,
        };
        this.guesses = {};
        this.cards = [];
        this.pending = true;
        this.disconnected = false;
    }

    /**
     * Set up the player's guesses property which holds information about how often they guessed
     * other players' cards. Should be called when the game is started
     * 
     * @param {Player[]} players The list of players in the game.
     */
    setupGuesses(players) {
        for(const player of players) {
            if(player.id === this.id) continue;
            this.guesses[player.id] = 0;
        }
    }

    /**
     * Draw a card from somewhere and put it in this player's hand.
     * 
     * @param {object} from an object that contains a .drawCard() method returning a card. Usually
     * a game.
     */
    drawCard(from) {
        this.cards.push(from.drawCard());
    }

    /**
     * Check whether the player has a certain card in their hand.
     * 
     * @param {string} cardId the card's id
     * @returns true if the player has the card in their hand, otherwise false
     */
    hasCard(cardId) {
        return this.cards.find(e => e.id === cardId);
    }

    /**
     * Remove a card from this player's hand.
     * 
     * @param {string} cardId the card's id
     */
    removeCard(cardId) {
        const i = this.cards.findIndex(e => e.id === cardId);
        this.cards.splice(i, 1);
    }

    /**
     * Award points to a player and not the reason.
     * 
     * @param {number} amount the amount of points the player gains
     * @param {string} through the reason for gaining these points. This will be stored in the player's
     * score property
     */
    awardPoints(amount, through) {
        this.score.total += amount;
        this.score.thisTurn += amount;
        if(through in this.score) this.score[through] += amount;
    }

    /**
     * Reset the player's turn score at the start of a new turn.
     */
    resetTurnScore() {
        this.score.thisTurn = 0;
    }

    /**
     * Note that this player has guessed another player's card.
     * 
     * @param {string} playerId the other player's id
     */
    guess(playerId) {
        this.guesses[playerId]++;
    }

    /**
     * Load a player from given database data.
     * 
     * @param {object} dbEntry the db entry from which to construct the player
     * @returns a new Player object
     */
    static load(dbEntry) {
        const player = new Player(dbEntry.name, dbEntry.avatar, dbEntry.playerId, dbEntry.privateId);
        player.score = {
            ...dbEntry.score,
            thisTurn: 0
        };
        for(const guess of dbEntry.guesses) {
            player.guesses[guess.playerId] = guess.amount;
        }
        player.cards = dbEntry.handCards?.map(e => ({ id: e.cardId }));
        return player;
    }
    
}

export default Player;