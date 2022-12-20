import { io } from "socket.io-client";

function createBot(gameId) {

    const name = 'Bot'
    const avatar = { eyes: 0, hair: 0, accessory: 0 };

    const socket = io('ws://localhost:3000');

    let credentials, handCards, chosenCards, me, lastGivenCard;

    socket.on('gamestarted', () => {
        socket.emit('getgameinfo', {...credentials});
    });

    socket.on('playerresponse', data => {
        me = data.players.find(player => player.id === credentials.playerId);
    })

    socket.on('cardresponse', data => {
        console.log('Card response', data);
        handCards = data.cards;
    })

    socket.on('chosencardresponse', data => {
        console.log('Chosen response', data);
        chosenCards = data.cards;
    })

    socket.on('runningstatechanged', data => {
        console.log(data, credentials);
        switch(data.state) {
            case 'waitForHint':
                if(me.active) {
                    lastGivenCard = handCards[0].id;
                    socket.emit('givehint', {...credentials, hint: { card: handCards[0].id, hint: 'I am a robot!' }});
                }
                break;
            case 'waitForCards':
                if(me.pending) {
                    lastGivenCard = handCards[0].id;
                    socket.emit('givecard', {...credentials, card: handCards[0].id});
                }
                break;
            case 'waitForGuesses':
                if(me.pending) {
                    setTimeout(() => {
                        const id = (chosenCards[0].id === lastGivenCard) ? chosenCards[1].id : chosenCards[0].id
                        socket.emit('guess', {...credentials, card: id})
                    }, 500);
                }
                break;
        }
    })

    return(new Promise((resolve) => {

        socket.emit('join', {
            gameId: gameId,
            player: { name: name, avatar: avatar, },
        })

        socket.on('joinresponse', (data) => {
            console.log(data);
            credentials = {
                gameId: gameId,
                playerId: data.playerId,
                privateId: data.privateId,
            }
            resolve(data.success);
        });

    }))

}

export default createBot