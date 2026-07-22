// --- DADOS E ESTADO GLOBAL ---
let players = JSON.parse(localStorage.getItem('cabeloke_players')) || [];
let queue = [];
let currentQueueIndex = 0;
let ytPlayer;
let currentMode = 'relax';
let effectInterval;
let resultTimer;

// Dados de Desafios (Década de 70 pra trás - Exemplos)
const retroChallenges = [
    { q: "Em que ano o homem pisou na Lua pela primeira vez?", ops: ["1965", "1969", "1971"], a: 1 },
    { q: "Qual banda lançou o álbum 'The Dark Side of the Moon' em 1973?", ops: ["Led Zeppelin", "Pink Floyd", "The Beatles"], a: 1 },
    { q: "Quem era conhecido como o 'Rei do Rock'?", ops: ["Chuck Berry", "Elvis Presley", "Little Richard"], a: 1 }
];

// Comentários da Zoira (Para notas baixas/médias)
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
    // Limpa qualquer efeito ou timer ativo ao mudar de tela
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
    document.getElementById('yt-search').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') simulateYTSearch();
    });
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
    document.getElementById('btn-exit').addEventListener('click', () => { if(ytPlayer) ytPlayer.stopVideo(); showScreen('screen-select-song'); });
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
        // Lista na tela de cadastro
        listMain.innerHTML += `<li class="player-item">${p.name}</li>`;
        
        // Lista na tela de configurações (com apagar/editar)
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

// --- FILA E SELEÇÃO DE MÚSICA (SIMULADO) ---
function simulateYTSearch() {
    const query = document.getElementById('yt-search').value;
    const results = document.getElementById('search-results');
    results.innerHTML = '';
    
    // Simulação de 3 resultados baseados na busca
    for(let i=1; i<=3; i++) {
        const title = `${query} - Karaokê Version ${i}`;
        const vidId = 'dQw4w9WgXcQ'; // Rick Roll de exemplo pra tudo
        results.innerHTML += `
            <div class="song-item">
                <span>${title}</span>
                <button onclick="addToQueue('${title}', '${vidId}')">➕ Add</button>
            </div>
        `;
    }
}

function addToQueue(title, videoId) {
    queue.push({ title, videoId });
    updateQueueList();
}

function updateQueueList() {
    const list = document.getElementById('queue-list');
    list.innerHTML = '';
    queue.forEach((s, index) => {
        list.innerHTML += `<li class="song-item">${index+1}. ${s.title}</li>`;
    });
}

function startShow() {
    if (queue.length === 0) return alert("Adicione músicas na fila primeiro!");
    
    currentQueueIndex = 0;
    if (document.getElementById('shuffle-mode').checked) {
        queue = queue.sort(() => Math.random() - 0.5);
        updateQueueList();
    }
    setupYoutubePlayer(); // Inicializa a API
    prepareNextSinger();
}

// --- LÓGICA DO PLAYER E MINIGAMES ---
function onYouTubeIframeAPIReady() {
    // Função exigida pela API, mas vamos criar o player sob demanda
}

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
    // Se o player já existe, carrega o vídeo. Se não, a API vai carregar no setupYoutubePlayer
    if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(song.videoId);
    } else {
        // Gambiarra necessária caso a API demore a carregar
        setTimeout(() => ytPlayer.loadVideoById(song.videoId), 1000);
    }
}

function onPlayerReady(event) {
    // Player pronto, mas só damos play quando escolher o modo
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        activateGameEffects();
    } else if (event.data === YT.PlayerState.ENDED) {
        clearGameEffects();
        showResult();
    } else if (event.data === YT.PlayerState.PAUSED) {
        clearGameEffects(); // Para os efeitos se pausar
    }
}

function skipSong() {
    if(ytPlayer) ytPlayer.stopVideo();
    showResult(); // Vai pro resultado da música atual
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
        // Flicker: Aleatório a cada 15s, dura até 5s
        effectInterval = setInterval(() => {
            if(Math.random() > 0.5) { // 50% de chance de rolar a cada ciclo
                overlay.classList.add('effect-flicker');
                setTimeout(() => overlay.classList.remove('effect-flicker'), Math.random() * 4000 + 1000);
            }
        }, 15000);
    } else if (currentMode === 'chuveiro') {
        // Chuveiro: Efeito constante (ou poderia ser aleatório também)
        overlay.classList.add('effect-blur-invert');
    } else if (currentMode === 'profissional') {
        // Blackout: A cada 40s, dura 5s (usando a lógica pedida)
        effectInterval = setInterval(() => {
             overlay.classList.add('effect-blackout');
             setTimeout(() => overlay.classList.remove('effect-blackout'), 5000);
        }, 40000); 
    }
}

function clearGameEffects() {
    clearInterval(effectInterval);
    const overlay = document.getElementById('player-overlay');
    overlay.className = ''; // Remove todas as classes de efeito
}

// --- TELA DE RESULTADO (A NOTA E A ZOIRA) ---
function showResult() {
    showScreen('screen-result');
    const singer = players[currentQueueIndex % players.length];
    let score = 0;
    let comment = "";

    // Lógica Especial para "Cabelo" ou "Lucas Cabelo"
    if (singer.name.toLowerCase().includes('cabelo')) {
        score = 100; // Nota Máxima
        comment = `Sabemos que você canta mal pra caramba ${singer.name}, mas a empolgação foi nota 100! O CabelOKÊ te ama! 🔥`;
    } else {
        // Nota Aleatória entre 10 e 95 (pra nunca dar 100)
        score = Math.floor(Math.random() * 85) + 10;
        
        if (score > 80) comment = "Até que não foi tão ruim. Me surpreendeu.";
        else if (score > 50) comment = "Ficou na média. Dá pra melhorar pro próximo churrasco.";
        else comment = roastComments[Math.floor(Math.random() * roastComments.length)];
    }

    document.getElementById('res-player-name').innerText = singer.name;
    document.getElementById('res-score').innerText = score;
    document.getElementById('res-comment').innerText = comment;

    // Timer de 10 segundos para a próxima música
    resultTimer = setTimeout(nextTurn, 10000);
}

function nextTurn() {
    currentQueueIndex++;
    if (currentQueueIndex < queue.length) {
        prepareNextSinger();
    } else {
        // Acabaram as músicas
        alert("O Show acabou! Adicione mais veneno na fila.");
        queue = [];
        updateQueueList();
        showScreen('screen-select-song');
    }
}

// --- LÓGICA DO DESAFIO (PULAR A VEZ) ---
let currentChallengeAnswer = -1;

function showChallenge() {
    if(ytPlayer) ytPlayer.pauseVideo(); // Pausa a música
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

    if (selectedIndex === currentChallengeAnswer) {
        resultP.innerText = "Acertou! Pulando para o próximo...";
        resultP.style.color = "var(--primary-color)";
        setTimeout(() => {
            document.getElementById('challenge-modal').classList.add('hidden');
            skipSong(); // Pula a música atual (vai pro resultado e depois próximo)
        }, 2000);
    } else {
        resultP.innerText = "ERROU! JÁ SABE NE? VAI TER QUE BEBER! 🍻🍺";
        resultP.style.color = "var(--secondary-color)";
        // Efeito de piscar vermelho pra zoar
        modalContent.style.borderColor = "var(--secondary-color)";
        setTimeout(() => {
             document.getElementById('challenge-modal').classList.add('hidden');
             modalContent.style.borderColor = "var(--primary-color)";
             ytPlayer.playVideo(); // Volta a música, ele tem que terminar de cantar
        }, 4000);
    }
}