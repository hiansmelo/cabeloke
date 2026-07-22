// --- DADOS E ESTADO GLOBAL ---
let players = JSON.parse(localStorage.getItem('cabeloke_players')) || [];
let queue = [];
let currentQueueIndex = 0;
let ytPlayer;
let currentMode = 'relax';
let effectInterval;
let resultTimer;

// Músicas de amostra para simular a busca no YouTube (com IDs reais e thumbnails)
const sampleSongs = [
    { title: "Evidências - Chitãozinho & Xororó (Karaokê)", videoId: "hA2kCskO-7g" },
    { title: "Musa do Verão - Felipe Dylon (Karaokê)", videoId: "I_Y1fE38E3k" },
    { title: "Bohemian Rhapsody - Queen (Karaoke)", videoId: "fJ9rUzIMcZQ" },
    { title: "Anna Júlia - Los Hermanos (Karaokê)", videoId: "G3qT6L11oI4" },
    { title: "Fogo e Paixão - Wando (Karaokê)", videoId: "9qJp3O3VjYc" },
    { title: "Borbulhas de Amor - Fagner (Karaokê)", videoId: "c_qA5d_gY_E" }
];

// Dados de Desafios (Década de 70 pra trás)
const retroChallenges = [
    { q: "Em que ano o homem pisou na Lua pela primeira vez?", ops: ["1965", "1969", "1971"], a: 1 },
    { q: "Qual banda lançou o álbum 'The Dark Side of the Moon' em 1973?", ops: ["Led Zeppelin", "Pink Floyd", "The Beatles"], a: 1 },
    { q: "Quem era conhecido como o 'Rei do Rock'?", ops: ["Chuck Berry", "Elvis Presley", "Little Richard"], a: 1 }
];

// Comentários da Zoira
const roastComments = [
    "Meus ouvidos estão sangrando, mas a performance foi top.",
    "Você canta bem... bem longe de mim.",
    "A nota é baixa, mas a coragem é 10.",
    "Tentei te defender, mas ficou difícil.",
    "Ainda bem que o microfone tava desligado.",
    "Mirou no Noely, acertou na taquara rachada."
];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    updatePlayersLists();
    setupEventListeners();
    checkStartButton();
});

// --- SISTEMA DE NAVEGAÇÃO DE TELAS ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    clearGameEffects();
    clearTimeout(resultTimer);
}

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {
    // Intro
    document.getElementById('screen-intro').addEventListener('click', () => showScreen('screen-players'));

    // Cadastro de Jogadores
    document.getElementById('add-player').addEventListener('click', addPlayer);
    document.getElementById('start-app').addEventListener('click', () => showScreen('screen-select-song'));
    document.getElementById('btn-config').addEventListener('click', () => showScreen('screen-settings'));

    // Configurações
    document.getElementById('btn-back-settings').addEventListener('click', () => showScreen('screen-players'));

    // Seleção de Música
    document.getElementById('yt-search').addEventListener('input', simulateYTSearch);
    document.getElementById('start-show').addEventListener('click', startShow);

    // Seleção de Modo
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentMode = e.target.dataset.mode;
            startCurrentSong();
        });
    });

    // Player Controls
    document.getElementById('btn-skip').addEventListener('click', skipSong);
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('resume-song').addEventListener('click', togglePause);
    document.getElementById('go-to-main').addEventListener('click', () => { togglePause(); showScreen('screen-select-song'); });
    document.getElementById('btn-exit').addEventListener('click', () => { if(ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo(); showScreen('screen-select-song'); });
    document.getElementById('btn-skip-turn').addEventListener('click', showChallenge);
}

// --- GESTÃO DE JOGADORES ---
function addPlayer() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    if (name) {
        players.push({ id: Date.now(), name: name });
        savePlayers();
        updatePlayersLists();
        nameInput.value = '';
    }
}

function deletePlayer(id) {
    players = players.filter(p => p.id !== id);
    savePlayers();
    updatePlayersLists();
}

function savePlayers() {
    localStorage.setItem('cabeloke_players', JSON.stringify(players));
    checkStartButton();
}

function checkStartButton() {
    document.getElementById('start-app').disabled = players.length === 0;
}

function updatePlayersLists() {
    const listMain = document.getElementById('players-list');
    const listConfig = document.getElementById('manage-players-list');
    listMain.innerHTML = ''; listConfig.innerHTML = '';

    players.forEach(p => {
        listMain.innerHTML += `<li class="player-item">${p.name}</li>`;
        
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `<span>${p.name}</span> 
                        <div>
                            <button onclick="editPlayer(${p.id})">✏️</button>
                            <button onclick="deletePlayer(${p.id})">❌</button>
                        </div>`;
        listConfig.appendChild(li);
    });
}

function editPlayer(id) {
    const player = players.find(p => p.id === id);
    const newName = prompt("Editar nome:", player.name);
    if (newName && newName.trim()) {
        player.name = newName.trim();
        savePlayers();
        updatePlayersLists();
    }
}

// --- EXTRAÇÃO DE ID DO YOUTUBE ---
function extractVideoId(urlOrText) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrText.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// --- FILA E SELEÇÃO DE MÚSICA COM MINIATURAS ---
function simulateYTSearch() {
    const query = document.getElementById('yt-search').value.trim();
    const results = document.getElementById('search-results');
    results.innerHTML = '';

    if (!query) return;

    // Se o usuário colou um link do YouTube
    const extractedId = extractVideoId(query);
    if (extractedId) {
        const thumbUrl = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
        results.innerHTML = `
            <div class="song-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="${thumbUrl}" alt="Capá" style="width: 80px; height: 60px; object-fit: cover; border-radius: 5px;">
                <div style="flex: 1;">
                    <strong>Vídeo por Link Directo</strong><br>
                    <small>ID: ${extractedId}</small>
                </div>
                <button onclick="addToQueue('Vídeo Personalizado (${extractedId})', '${extractedId}')">➕ Add</button>
            </div>
        `;
        return;
    }

    // Busca filtrada das músicas de amostra
    const filtered = sampleSongs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
    const listToDisplay = filtered.length > 0 ? filtered : sampleSongs;

    listToDisplay.forEach(song => {
        const thumbUrl = `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`;
        results.innerHTML += `
            <div class="song-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="${thumbUrl}" alt="${song.title}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 5px;">
                <span style="flex: 1; text-align: left;">${song.title}</span>
                <button onclick="addToQueue('${song.title.replace(/'/g, "\\'")}', '${song.videoId}')">➕ Add</button>
            </div>
        `;
    });
}

function addToQueue(title, videoId) {
    queue.push({ title, videoId });
    updateQueueList();
}

function updateQueueList() {
    const list = document.getElementById('queue-list');
    list.innerHTML = '';
    queue.forEach((s, index) => {
        const thumbUrl = `https://img.youtube.com/vi/${s.videoId}/hqdefault.jpg`;
        list.innerHTML += `
            <li class="song-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <span>${index + 1}.</span>
                <img src="${thumbUrl}" alt="${s.title}" style="width: 50px; height: 38px; object-fit: cover; border-radius: 3px;">
                <span style="flex: 1; text-align: left;">${s.title}</span>
            </li>`;
    });
}

function startShow() {
    if (queue.length === 0) return alert("Adicione músicas na fila primeiro!");
    
    currentQueueIndex = 0;
    if (document.getElementById('shuffle-mode').checked) {
        queue = queue.sort(() => Math.random() - 0.5);
        updateQueueList();
    }
    setupYoutubePlayer();
    prepareNextSinger();
}

// --- LÓGICA DO PLAYER E MINIGAMES ---
function onYouTubeIframeAPIReady() {}

function setupYoutubePlayer() {
    if (!ytPlayer) {
        ytPlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            playerVars: { 'autoplay': 1, 'controls': 0, 'rel': 0, 'showinfo': 0 },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

function prepareNextSinger() {
    const singer = players[currentQueueIndex % players.length];
    document.getElementById('next-singer-title').innerText = `Preparado, ${singer.name}?`;
    showScreen('screen-modes');
}

function startCurrentSong() {
    showScreen('screen-player');
    const song = queue[currentQueueIndex];
    if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(song.videoId);
    } else {
        setTimeout(() => ytPlayer.loadVideoById(song.videoId), 1000);
    }
}

function onPlayerReady(event) {}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        activateGameEffects();
    } else if (event.data === YT.PlayerState.ENDED) {
        clearGameEffects();
        showResult();
    } else if (event.data === YT.PlayerState.PAUSED) {
        clearGameEffects();
    }
}

function skipSong() {
    if(ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    showResult();
}

function togglePause() {
    const state = ytPlayer.getPlayerState();
    const modal = document.getElementById('pause-menu');
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
        modal.classList.remove('hidden');
    } else {
        ytPlayer.playVideo();
        modal.classList.add('hidden');
    }
}

// --- LÓGICA DOS MINIGAMES (EFEITOS) ---
function activateGameEffects() {
    clearGameEffects();
    const overlay = document.getElementById('player-overlay');
    
    if (currentMode === 'garagem') {
        effectInterval = setInterval(() => {
            if(Math.random() > 0.5) {
                overlay.classList.add('effect-flicker');
                setTimeout(() => overlay.classList.remove('effect-flicker'), Math.random() * 4000 + 1000);
            }
        }, 15000);
    } else if (currentMode === 'chuveiro') {
        overlay.classList.add('effect-blur-invert');
    } else if (currentMode === 'profissional') {
        effectInterval = setInterval(() => {
             overlay.classList.add('effect-blackout');
             setTimeout(() => overlay.classList.remove('effect-blackout'), 5000);
        }, 40000); 
    }
}

function clearGameEffects() {
    clearInterval(effectInterval);
    const overlay = document.getElementById('player-overlay');
    overlay.className = '';
}

// --- TELA DE RESULTADO ---
function showResult() {
    showScreen('screen-result');
    const singer = players[currentQueueIndex % players.length];
    let score = 0;
    let comment = "";

    if (singer.name.toLowerCase().includes('cabelo')) {
        score = 100;
        comment = `Sabemos que você canta mal pra caramba ${singer.name}, mas a empolgação foi nota 100! O CabelOKÊ te ama! 🔥`;
    } else {
        score = Math.floor(Math.random() * 85) + 10;
        if (score > 80) comment = "Até que não foi tão ruim. Me surpreendeu.";
        else if (score > 50) comment = "Ficou na média. Dá pra melhorar pro próximo churrasco.";
        else comment = roastComments[Math.floor(Math.random() * roastComments.length)];
    }

    document.getElementById('res-player-name').innerText = singer.name;
    document.getElementById('res-score').innerText = score;
    document.getElementById('res-comment').innerText = comment;

    resultTimer = setTimeout(nextTurn, 10000);
}

function nextTurn() {
    currentQueueIndex++;
    if (currentQueueIndex < queue.length) {
        prepareNextSinger();
    } else {
        alert("O Show acabou! Adicione mais veneno na fila.");
        queue = [];
        updateQueueList();
        showScreen('screen-select-song');
    }
}

// --- LÓGICA DO DESAFIO (PULAR A VEZ) ---
let currentChallengeAnswer = -1;

function showChallenge() {
    if(ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    const modal = document.getElementById('challenge-modal');
    const challenge = retroChallenges[Math.floor(Math.random() * retroChallenges.length)];
    
    document.getElementById('challenge-question').innerText = challenge.q;
    const optionsDiv = document.getElementById('challenge-options');
    optionsDiv.innerHTML = '';
    currentChallengeAnswer = challenge.a;

    challenge.ops.forEach((op, index) => {
        const btn = document.createElement('button');
        btn.innerText = op;
        btn.onclick = () => checkChallengeAnswer(index);
        optionsDiv.appendChild(btn);
    });

    modal.classList.remove('hidden');
    document.getElementById('challenge-result').classList.add('hidden');
}

function checkChallengeAnswer(selectedIndex) {
    const resultP = document.getElementById('challenge-result');
    resultP.classList.remove('hidden');
    const modalContent = document.querySelector('#challenge-modal .modal-content');

    // Desabilita os botões para evitar múltiplos cliques
    document.querySelectorAll('#challenge-options button').forEach(b => b.disabled = true);

    if (selectedIndex === currentChallengeAnswer) {
        resultP.innerText = "Acertou! Pulando para a próxima pessoa...";
        resultP.style.color = "var(--primary-color)";
        setTimeout(() => {
            document.getElementById('challenge-modal').classList.add('hidden');
            skipSong();
        }, 3000);
    } else {
        resultP.innerText = "ERROU! VAI TER QUE BEBER! 🍻🍺";
        resultP.style.color = "var(--secondary-color)";
        modalContent.style.borderColor = "var(--secondary-color)";
        
        // Fecha automaticamente a janela após 3 segundos e retoma a música
        setTimeout(() => {
             document.getElementById('challenge-modal').classList.add('hidden');
             modalContent.style.borderColor = "var(--primary-color)";
             if(ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
        }, 3000);
    }
}
