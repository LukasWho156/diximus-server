/**
 * Convenience function to check whether a user request is valid or not. Checks if the requested game exists,
 * if the requesting player is in that game and if the game is in the state it should be in. If any of these
 * conditions are not met, the request is invalid.
 * 
 * @param {*} gameDB the game database to be used, must contain a .get method.
 * @param {string} gameId the game's id
 * @param {string} playerId the requesting player's id.
 * @param {string | string[]} expectedState the state the game must be in or a collection of states the game can be in.
 * @returns true if valid, otherwise false
 */
const checkValidity = (gameDB, gameId, playerId, privateId, expectedState) => {
    const game = gameDB.get(gameId);
    let condition = (game?.state === expectedState)
    if(Array.isArray(expectedState)) condition = expectedState.find(e => e === game?.state);
    if(!condition) return false;
    const player = game.findPlayer(playerId);
    if(!player) return false;
    if(player.privateId !== privateId) return false;
    return {
        game: game,
        player: player,
    };
}

export default checkValidity;