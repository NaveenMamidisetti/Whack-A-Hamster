class RandomQueue {
    constructor(items = []) {
        this.queue = items.slice();
    }
    enqueue(item) {
        const i = Math.floor(Math.random() * (this.queue.length + 1));
        this.queue.splice(i, 0, item);
    }
    dequeue() {
        return this.queue.shift();
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    refill(n) {
        this.queue = [];
        for (let i = 0; i < n; i++) this.enqueue(i);
    }
}

// DOM Elements - Pages
const startPage = document.getElementById("startPage");
const gamePage = document.getElementById("gamePage");
const gameOverPage = document.getElementById("gameOverPage");

// DOM Elements - Start Page
const levelButtons = document.querySelectorAll(".level-button");
const highScoreBeginner = document.getElementById("highScoreBeginner");
const highScoreIntermediate = document.getElementById("highScoreIntermediate");
const highScoreMaster = document.getElementById("highScoreMaster");

// DOM Elements - Game Page
const gridContainer = document.getElementById("grid-container");
const scoreDisplay = document.getElementById("scoreDisplay");
const levelHighScoreDisplay = document.getElementById("levelHighScoreDisplay");
const currentLevelDisplay = document.getElementById("currentLevelDisplay");
const pauseResumeButton = document.getElementById("pauseResumeButton");
const endGameButton = document.getElementById("endGameButton");
const timerDisplay = document.getElementById("timerDisplay");

// DOM Elements - Game Over Page
const finalScoreDisplay = document.getElementById("finalScore");
const newHighScoreMessage = document.getElementById("newHighScoreMessage");
const playAgainButton = document.getElementById("playAgainButton");

// Game State Variables
let score = 0;
let baseInterval = 1200;
let currentInterval = baseInterval;
let spawnTimer = null;
let currentHoleWrappers = [];
let queue = new RandomQueue();
let activeMoleIndex = -1;
let gamePaused = false;
let currentLevelSize = 3;
let highScores = { '3': 0, '4': 0, '5': 0 };

// Timer Variables
let totalGameTime = 60;
let timeLeft = totalGameTime;
let timerInterval = null;
let lastResumeTime = null;
let accumulatedPausedTime = 0;

// --- Page Navigation ---
function showPage(pageElement) {
    document.querySelectorAll('.game-page').forEach(page => {
        page.classList.remove('active');
    });
    setTimeout(() => {
        pageElement.classList.add('active');
    }, 10);
}

function updateHighScoresDisplay() {
    highScoreBeginner.textContent = highScores['3'];
    highScoreIntermediate.textContent = highScores['4'];
    highScoreMaster.textContent = highScores['5'];
}

function loadHighScores() {
    const savedScores = localStorage.getItem('whackAHamsterHighScores');
    if (savedScores) highScores = JSON.parse(savedScores);
    updateHighScoresDisplay();
}

function saveHighScores() {
    localStorage.setItem('whackAHamsterHighScores', JSON.stringify(highScores));
}

// --- Timer ---
function startTimer() {
    lastResumeTime = Date.now();
    timerInterval = setInterval(() => {
        if (!gamePaused) {
            const elapsed = Math.floor((Date.now() - lastResumeTime - accumulatedPausedTime) / 1000);
            timeLeft = totalGameTime - elapsed;
            timerDisplay.textContent = `Time: ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endGame();
            }
        }
    }, 500);
}

// --- Game Logic ---
function createGrid(size) {
    gridContainer.innerHTML = "";
    currentHoleWrappers = [];

    const gridPadding = 15;
    const gridBorder = 8;
    const availableWidth = gridContainer.clientWidth - (2 * gridPadding) - (2 * gridBorder);
    let gap = 10;
    let holeSize = (availableWidth - (size - 1) * gap) / size;

    holeSize = Math.max(holeSize, 50);
    holeSize = Math.min(holeSize, 120);

    gridContainer.style.gridTemplateColumns = `repeat(${size}, ${holeSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${size}, ${holeSize}px)`;
    gridContainer.style.gap = `${gap}px`;

    for (let i = 0; i < size * size; i++) {
        const holeWrapper = document.createElement("div");
        holeWrapper.classList.add("hole-wrapper");
        holeWrapper.dataset.index = i;
        holeWrapper.style.width = `${holeSize}px`;
        holeWrapper.style.height = `${holeSize}px`;

        const hamsterDiv = document.createElement("div");
        hamsterDiv.classList.add("hamster");

        holeWrapper.appendChild(hamsterDiv);
        currentHoleWrappers.push(holeWrapper);
        gridContainer.appendChild(holeWrapper);
    }
    queue.refill(size * size);
}

function handleHamsterHit(event) {
    if (gamePaused) return;

    const hamsterElement = event.target;
    const holeWrapper = hamsterElement.closest('.hole-wrapper');
    const index = parseInt(holeWrapper.dataset.index);

    if (index === activeMoleIndex && holeWrapper.classList.contains("active")) {
        hamsterElement.removeEventListener("click", handleHamsterHit);
        hamsterElement.classList.add('flinch');

        score++;
        scoreDisplay.textContent = `Score: ${score}`;
        clearTimeout(spawnTimer);
        activeMoleIndex = -1;

        setTimeout(() => {
            holeWrapper.classList.remove("active");
            holeWrapper.classList.remove("glow");
            hamsterElement.classList.remove('flinch');

            if (score % 5 === 0 && currentInterval > getMinInterval(currentLevelSize)) {
                currentInterval *= 0.9;
            }
            spawnMole();
        }, 300);
    }
}

function spawnMole() {
    if (gamePaused) return;

    if (activeMoleIndex !== -1 && currentHoleWrappers[activeMoleIndex]) {
        const prevHoleWrapper = currentHoleWrappers[activeMoleIndex];
        const prevHamster = prevHoleWrapper.querySelector('.hamster');
        prevHoleWrapper.classList.remove("active");
        prevHoleWrapper.classList.remove("glow");
        prevHamster.removeEventListener("click", handleHamsterHit);
        prevHamster.classList.remove('flinch');
    }

    if (queue.isEmpty()) queue.refill(currentHoleWrappers.length);
    const idx = queue.dequeue();
    const holeWrapper = currentHoleWrappers[idx];
    const hamsterDiv = holeWrapper.querySelector('.hamster');

    activeMoleIndex = idx;
    holeWrapper.classList.add("active");
    holeWrapper.classList.add("glow");
    hamsterDiv.addEventListener("click", handleHamsterHit);

    spawnTimer = setTimeout(() => {
        if (holeWrapper.classList.contains("active")) {
            holeWrapper.classList.remove("active");
            holeWrapper.classList.remove("glow");
            hamsterDiv.removeEventListener("click", handleHamsterHit);
            hamsterDiv.classList.remove('flinch');
            activeMoleIndex = -1;
            spawnMole();
        }
    }, currentInterval);
}

function startGame(levelSize) {
    currentLevelSize = levelSize;
    score = 0;
    currentInterval = baseInterval;
    gamePaused = false;
    activeMoleIndex = -1;
    accumulatedPausedTime = 0;
    lastResumeTime = Date.now();

    pauseResumeButton.textContent = "Pause";
    timeLeft = totalGameTime;
    timerDisplay.textContent = `Time: ${timeLeft}s`;

    scoreDisplay.textContent = `Score: ${score}`;
    levelHighScoreDisplay.textContent = `High Score for this Level: ${highScores[currentLevelSize]}`;
    currentLevelDisplay.textContent = `Level: ${getLevelName(currentLevelSize)}`;

    createGrid(currentLevelSize);
    showPage(gamePage);

    setTimeout(() => {
        clearTimeout(spawnTimer);
        spawnMole();
        startTimer();
    }, 500);
}

function togglePauseGame() {
    gamePaused = !gamePaused;
    if (gamePaused) {
        if (activeMoleIndex !== -1 && currentHoleWrappers[activeMoleIndex]) {
            const holeWrapper = currentHoleWrappers[activeMoleIndex];
            const hamsterDiv = holeWrapper.querySelector('.hamster');
            holeWrapper.classList.remove("active");
            holeWrapper.classList.remove("glow");
            hamsterDiv.removeEventListener("click", handleHamsterHit);
            hamsterDiv.classList.remove('flinch');
            activeMoleIndex = -1;
        }
        clearTimeout(spawnTimer);
        pauseResumeButton.textContent = "Resume";
        accumulatedPausedTime += Date.now() - lastResumeTime;
    } else {
        lastResumeTime = Date.now();
        spawnMole();
        pauseResumeButton.textContent = "Pause";
    }
}

function endGame() {
    clearTimeout(spawnTimer);
    clearInterval(timerInterval);

    if (activeMoleIndex !== -1 && currentHoleWrappers[activeMoleIndex]) {
        const prevHoleWrapper = currentHoleWrappers[activeMoleIndex];
        const prevHamster = prevHoleWrapper.querySelector('.hamster');
        prevHoleWrapper.classList.remove("active");
        prevHoleWrapper.classList.remove("glow");
        prevHamster.removeEventListener("click", handleHamsterHit);
        prevHamster.classList.remove('flinch');
    }

    activeMoleIndex = -1;
    gamePaused = true;

    finalScoreDisplay.textContent = score;
    newHighScoreMessage.textContent = "";

    if (score > highScores[currentLevelSize]) {
        highScores[currentLevelSize] = score;
        saveHighScores();
        updateHighScoresDisplay();
        newHighScoreMessage.textContent = "New High Score!";
    }

    showPage(gameOverPage);
}

function getLevelName(size) {
    switch (size) {
        case 3: return 'Easy';
        case 4: return 'Intermediate';
        case 5: return 'Master';
        default: return 'Unknown';
    }
}

function getMinInterval(size) {
    switch (size) {
        case 3: return 600;
        case 4: return 400;
        case 5: return 200;
        default: return 600;
    }
}

// Event Listeners
levelButtons.forEach(button => {
    button.addEventListener("click", (event) => {
        const selectedLevelSize = parseInt(event.target.dataset.level);
        startGame(selectedLevelSize);
    });
});

pauseResumeButton.addEventListener("click", togglePauseGame);
endGameButton.addEventListener("click", endGame);

playAgainButton.addEventListener("click", () => {
    showPage(startPage);
    loadHighScores();
});

window.addEventListener('resize', () => {
    if (gamePage.classList.contains('active') && !gamePaused) {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            createGrid(currentLevelSize);
        }, 200);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadHighScores();
    showPage(startPage);
});
