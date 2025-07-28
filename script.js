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

// DOM Elements - Game Over Page
const finalScoreDisplay = document.getElementById("finalScore");
const newHighScoreMessage = document.getElementById("newHighScoreMessage");
const playAgainButton = document.getElementById("playAgainButton");


// Game State Variables
let score = 0;
let baseInterval = 1200;
let currentInterval = baseInterval;
let spawnTimer = null; // Holds the timeout ID for current hamster's disappearance
let currentHoleWrappers = [];
let queue = new RandomQueue();
let activeMoleIndex = -1;
let gamePaused = false;
let currentLevelSize = 3;
let highScores = {
    '3': 0, // Easy (3x3)
    '4': 0, // Intermediate (4x4)
    '5': 0  // Master (5x5)
};

// --- Page Navigation Functions ---
function showPage(pageElement) {
    document.querySelectorAll('.game-page').forEach(page => {
        page.classList.remove('active');
    });
    // Add a short delay to allow transition to play out
    setTimeout(() => {
        pageElement.classList.add('active');
    }, 10); // A small delay to ensure CSS transition triggers
}

function updateHighScoresDisplay() {
    highScoreBeginner.textContent = highScores['3'];
    highScoreIntermediate.textContent = highScores['4'];
    highScoreMaster.textContent = highScores['5'];
}

function loadHighScores() {
    const savedScores = localStorage.getItem('whackAHamsterHighScores');
    if (savedScores) {
        highScores = JSON.parse(savedScores);
    }
    updateHighScoresDisplay();
}

function saveHighScores() {
    localStorage.setItem('whackAHamsterHighScores', JSON.stringify(highScores));
}

// --- Game Logic Functions ---
function createGrid(size) {
    gridContainer.innerHTML = "";
    currentHoleWrappers = [];

    const gridPadding = 15; // From CSS
    const gridBorder = 8; // From CSS
    
    // Get the *actual* client width of the gridContainer after CSS has rendered it
    // Use a temporary div if gridContainer isn't visible yet
    let tempGridContainer = gridContainer;
    if (gamePage.classList.contains('active') === false) {
        // If gamePage is not active, we can temporarily show it or use a proxy
        // For robustness, let's make sure gridContainer is measured when gamePage is active
        // This function should primarily be called when gamePage is active or about to be.
        // If called from start screen, gridContainer.clientWidth might be 0.
        // A common solution is to have a fixed max-width for the grid or ensure the gamePage is briefly shown.
        // For now, assuming createGrid is called when gamePage is active or sizing is less critical
    }


    const availableWidth = gridContainer.clientWidth - (2 * gridPadding) - (2 * gridBorder);

    let gap = 10; // Base gap from CSS

    let holeSize;
    // Calculate hole size dynamically to fit the grid
    // Formula: (Total available width - total gap space) / number of holes
    holeSize = (availableWidth - (size - 1) * gap) / size;
    
    // Ensure holeSize doesn't become too small (e.g., min 50px) or too large
    holeSize = Math.max(holeSize, 50); // Minimum size
    holeSize = Math.min(holeSize, 120); // Maximum size to prevent huge holes on large screens

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

        clearTimeout(spawnTimer); // Clear the timeout for the current hamster's natural disappearance
        activeMoleIndex = -1; // No mole is active anymore

        setTimeout(() => {
            holeWrapper.classList.remove("active");
            holeWrapper.classList.remove("glow");
            hamsterElement.classList.remove('flinch');

            if (score % 5 === 0 && currentInterval > getMinInterval(currentLevelSize)) {
                currentInterval *= 0.9;
            }
            spawnMole(); // Spawn the next mole immediately after the hit animation and cleanup
        }, 300); // Flinch duration
    }
}

function spawnMole() {
    if (gamePaused) return;

    // Clean up previously active mole if it exists and wasn't hit
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

    // Set a timeout for this new hamster's natural disappearance
    spawnTimer = setTimeout(() => {
        if (holeWrapper.classList.contains("active")) {
            holeWrapper.classList.remove("active");
            holeWrapper.classList.remove("glow");
            hamsterDiv.removeEventListener("click", handleHamsterHit);
            hamsterDiv.classList.remove('flinch');
            activeMoleIndex = -1;
            spawnMole(); // Spawn the next mole when this one times out
        }
    }, currentInterval);
}


function startGame(levelSize) {
    currentLevelSize = levelSize;
    score = 0;
    currentInterval = baseInterval;
    gamePaused = false;
    activeMoleIndex = -1;
    pauseResumeButton.textContent = "Pause";
    
    scoreDisplay.textContent = `Score: ${score}`;
    levelHighScoreDisplay.textContent = `High Score for this Level: ${highScores[currentLevelSize]}`;
    currentLevelDisplay.textContent = `Level: ${getLevelName(currentLevelSize)}`;

    // Create grid and then show the game page
    createGrid(currentLevelSize);
    showPage(gamePage); // Navigate to game page

    // Start spawning moles after a short delay to allow page transition
    setTimeout(() => {
        clearTimeout(spawnTimer); // Clear any old timers
        spawnMole();
    }, 500); // Wait for page transition (0.5s)
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
    } else {
        spawnMole(); 
        pauseResumeButton.textContent = "Pause";
    }
}

function endGame() {
    clearTimeout(spawnTimer);
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

    showPage(gameOverPage); // Navigate to game over page
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

// --- Event Listeners ---
levelButtons.forEach(button => {
    button.addEventListener("click", (event) => {
        const selectedLevelSize = parseInt(event.target.dataset.level);
        startGame(selectedLevelSize);
    });
});

pauseResumeButton.addEventListener("click", togglePauseGame);
endGameButton.addEventListener("click", endGame);

playAgainButton.addEventListener("click", () => {
    showPage(startPage); // Go back to start page
    loadHighScores(); // Refresh scores on start screen
});

// Add a resize listener to adjust grid size if window size changes
window.addEventListener('resize', () => {
    // Only re-create grid if gamePage is currently active and not paused
    if (gamePage.classList.contains('active') && !gamePaused) {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            createGrid(currentLevelSize);
        }, 200);
    }
});


// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    loadHighScores();
    showPage(startPage); // Start on the level selection page
});