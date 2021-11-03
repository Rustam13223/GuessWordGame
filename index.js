const { JSDOM } = require('jsdom');
const axios = require('axios');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

//Game Side

async function getRandomWord() {
    const url = 'https://calculator888.ru/random-generator/sluchaynoye-slovo';
    const html = await axios(url).then((res) => res.data);
    const dom = new JSDOM(html);
    return dom.window.document.querySelector("#bov").textContent;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}



function shuffle(word) {
    const a = word.split(""),
    n = a.length;

    for(let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a.join("");
}

function updatePlayerList() {
    players.sort((a, b) => {
        if (a.score < b.score) {
            return 1;
        } else if (a.score > b.score) {
            return -1;
        }
    });
    io.emit('changePlayerList', {
        list: players,
    });
}

let currentRealWord, currentSecretWord;

getRandomWord().then((word) => {
    currentRealWord = word;
    currentSecretWord = shuffle(currentRealWord);
    console.log(currentRealWord);
});

let players = [];

//End Side
io.on('connection', (socket) => {
    io.emit('changeSecretWord', currentSecretWord);
    socket.on('register', (username) => {
        players.push({
            id: socket.id,
            username: username,
            score: 0,
        });
        updatePlayerList();
    });

    socket.on('guess', (word) => {
        if (word === currentRealWord) {
            for (let i = 0; i < players.length; i++) {
                if (socket.id === players[i].id) {
                    players[i].score += 1;
                    updatePlayerList();
                }
            }
            getRandomWord().then((word) => {
                currentRealWord = word;
                currentSecretWord = shuffle(currentRealWord);
                console.log(currentRealWord);
                io.emit('changeSecretWord', currentSecretWord);
            });
        }

    });

    socket.on('disconnect', () => {
        for (let i = 0; i < players.length; i++) {
            if (players[i].id === socket.id) {
                players.splice(i, 1);
                break;
            }
        }
        updatePlayerList();
    });
    
});

const port = 80;
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is working on port ${port}`);
});