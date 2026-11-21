
const wordList = document.getElementById("word-list");
const wordsArea = document.getElementById("words");
const cursor = document.getElementById("typing-cursor");
const input = document.getElementById("typing-input");

const timerDisplay = document.getElementById("timer");
const wpmDisplay = document.getElementById("wpm");
const accuracyDisplay = document.getElementById("accuracy");
const navWpm = document.getElementById("nav-wpm");

const resultBox = document.getElementById("result");

const finalWpm = document.getElementById("final-wpm");
const finalAccuracy = document.getElementById("final-accuracy");

const restartButton = document.getElementById("restart");
const tryAgainButton = document.getElementById("try-again");

const bank = {
    easy: "the you and are can make good time work life home book play learn happy world love",
    normal: "design future success learn develop create change practice focus system result improve ability computer typing",
    hard: "technology programming application algorithm development innovation performance creativity experience intelligent consistency"
};

let targetText = "";
let typedText = "";
let characterElements = [];

let duration = 60;
let remaining = 60;
let mode = "time";
let difficulty = "normal";

let started = false;
let finished = false;
let startTime = null;
let timerInterval = null;

let cursorFrame = null;

// CREATE RANDOM WORDS

function generateText() {
    const source = bank[difficulty].split(" ");

    const count = mode === "words" ? 25 : 200;

    const words = [];

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(
            Math.random() * source.length
        );

        words.push(source[randomIndex]);
    }

    targetText = words.join(" ");
    return words;
}

// RENDER WORDS

function renderText() {
    wordList.innerHTML = "";
    characterElements = [];

    const words = generateText();

    words.forEach((word, wordIndex) => {
        const wordElement = document.createElement("span");
        wordElement.className = "word";

        [...word].forEach(character => {
            const letter = document.createElement("span");

            letter.className = "letter";
            letter.textContent = character;

            wordElement.appendChild(letter);
            characterElements.push(letter);
        });

        if (wordIndex < words.length - 1) {
            const space = document.createElement("span");

            space.className = "letter space";
            space.innerHTML = "&nbsp;";

            wordElement.appendChild(space);
            characterElements.push(space);
        }

        wordList.appendChild(wordElement);
    });
}

// SMOOTH YELLOW CURSOR

function moveCursor() {
    const index = typedText.length;

    let current = characterElements[index];

    let x;
    let y;
    let height;

    const areaRect = wordsArea.getBoundingClientRect();

    if (current) {
        const rect = current.getBoundingClientRect();

        x = rect.left - areaRect.left;
        y = rect.top - areaRect.top;
        height = rect.height;

    } else if (characterElements.length > 0) {
        const last = characterElements[
            characterElements.length - 1
        ];

        const rect = last.getBoundingClientRect();

        x = rect.right - areaRect.left;
        y = rect.top - areaRect.top;
        height = rect.height;

    } else {
        return;
    }

    cursor.style.height = `${height}px`;

    cursor.style.transform =
        `translate3d(${x}px, ${y}px, 0)`;
}

function requestCursorMove() {
    if (cursorFrame) {
        cancelAnimationFrame(cursorFrame);
    }

    cursorFrame = requestAnimationFrame(() => {
        moveCursor();
        cursorFrame = null;
    });
}

// UPDATE LETTER COLORS

function updateLetters() {
    characterElements.forEach((letter, index) => {
        letter.classList.remove(
            "correct",
            "incorrect"
        );

        if (index < typedText.length) {
            if (typedText[index] === targetText[index]) {
                letter.classList.add("correct");
            } else {
                letter.classList.add("incorrect");
            }
        }
    });

    requestCursorMove();
}

// START TIMER

function startTimer() {
    if (started || finished) return;

    started = true;
    startTime = Date.now();

    timerInterval = setInterval(() => {
        const elapsed = Math.floor(
            (Date.now() - startTime) / 1000
        );

        remaining = Math.max(0, duration - elapsed);

        timerDisplay.textContent = remaining;

        updateStats();

        if (remaining <= 0) {
            finishTest();
        }

    }, 100);
}

// CALCULATE WPM AND ACCURACY

function updateStats() {
    if (!startTime) return;

    let correct = 0;

    for (let i = 0; i < typedText.length; i++) {
        if (typedText[i] === targetText[i]) {
            correct++;
        }
    }

    const elapsedMinutes = Math.max(
        (Date.now() - startTime) / 60000,
        0.001
    );

    const wpm = Math.round(
        (correct / 5) / elapsedMinutes
    );

    const accuracy = typedText.length === 0
        ? 100
        : Math.round(
            (correct / typedText.length) * 100
        );

    wpmDisplay.textContent = wpm;
    navWpm.textContent = wpm;
    accuracyDisplay.textContent = accuracy + "%";
}

// FINISH TEST

function finishTest() {
    if (finished) return;

    finished = true;
    started = false;

    clearInterval(timerInterval);

    input.blur();

    updateStats();

    finalWpm.textContent = wpmDisplay.textContent;
    finalAccuracy.textContent = accuracyDisplay.textContent;

    resultBox.classList.remove("hidden");
}

// RESET TEST

function resetTest() {
    clearInterval(timerInterval);

    started = false;
    finished = false;
    startTime = null;

    typedText = "";
    input.value = "";

    remaining = duration;

    timerDisplay.textContent = remaining;

    wpmDisplay.textContent = "0";
    navWpm.textContent = "0";
    accuracyDisplay.textContent = "100%";

    resultBox.classList.add("hidden");

    renderText();
    requestCursorMove();
}

// TYPING INPUT

input.addEventListener("input", () => {
    if (finished) return;

    if (input.value.length > targetText.length) {
        input.value = input.value.slice(
            0,
            targetText.length
        );
    }

    typedText = input.value;

    if (typedText.length > 0 && !started) {
        startTimer();
    }

    updateLetters();

    if (started) {
        updateStats();
    }

    if (
        mode === "words" &&
        typedText.length === targetText.length
    ) {
        finishTest();
    }

    if (typedText.length === targetText.length) {
        finishTest();
    }
});

// CLICK TO START TYPING

wordsArea.addEventListener("click", () => {
    if (!finished) {
        input.focus();
    }
});

// KEYBOARD SHORTCUTS

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        resetTest();
        return;
    }

    if (
        event.key === "Enter" &&
        event.target === input &&
        event.shiftKey
    ) {
        event.preventDefault();
        resetTest();
        input.focus();
    }

    if (event.key === "Tab" && event.target === input) {
        event.preventDefault();

        resetTest();
        input.focus();
    }

});

// RESTART BUTTON

restartButton.addEventListener("click", () => {
    resetTest();
    input.focus();
});

tryAgainButton.addEventListener("click", () => {
    resetTest();
    input.focus();
});

// MODE SELECTION

document.querySelectorAll(".mode").forEach(button => {
    button.addEventListener("click", () => {

        document.querySelectorAll(".mode").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        mode = button.dataset.mode;

        resetTest();
    });
});

// TIME SELECTION

document.querySelectorAll(".duration").forEach(button => {
    button.addEventListener("click", () => {

        document.querySelectorAll(".duration").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        duration = Number(button.dataset.time);

        resetTest();
    });
});

// DIFFICULTY SELECTION

document.getElementById("difficulty").addEventListener("click", () => {

    const levels = ["easy", "normal", "hard"];

    const current = levels.indexOf(difficulty);

    difficulty = levels[(current + 1) % levels.length];

    document.getElementById("difficulty").textContent =
        "⚡ " + difficulty;

    resetTest();
});

// HANDLE SCREEN RESIZE

window.addEventListener("resize", () => {
    requestCursorMove();
});

// INITIALIZE WEBSITE

resetTest();
