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

// DAILY LIFE WORDS

const bank = {
    easy: `water food home bus tea milk rice book pen bag door fan bed sun rain cold hot road shop cash bill
        call text mail walk eat drink sleep wake cook wash buy sell pay wait help love game song film news
        time day night tree dog cat cow fish egg salt oil soap cup plate fork key lock shoe shirt cap bike
        car train fruit bread apple mango onion lunch phone chair table clock light glass tooth hand face
        milk sugar curry chai bowl bath soap hair nail ring belt sock mat lamp wall roof gate lane`.split(/\s+/),

    normal: `morning evening kitchen market friend family school college teacher student doctor hospital
        medicine station ticket travel holiday weekend festival birthday breakfast dinner coffee chicken
        biryani noodles chocolate potato tomato banana vegetables mobile charger battery laptop camera
        photo video message password number address window curtain pillow blanket mirror towel brush
        bucket bottle spoon plate bicycle petrol signal traffic street village garden flower bedroom
        bathroom balcony stairs shopping homework exam result exercise music movie story neighbour
        brother sister mother father uncle cousin`.split(/\s+/),

    hard: `breakfast newspaper umbrella cupboard staircase motorcycle headphones refrigerator television
        supermarket restaurant pharmacy hospital appointment prescription vegetables electricity
        connection transport reservation passenger platform luggage entertainment celebration
        neighbourhood apartment furniture washing machine groceries ingredients temperature
        homework assignment examination certificate university classroom playground swimming
        badminton cricket marketing delivery payment receipt notification attachment download`.split(/\s+/)
};

// words mode: duration button -> number of words
const wordCountFor = { 15: 10, 30: 25, 60: 50, 120: 100 };

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

// smooth cursor (har frame pe target ki taraf glide karta hai)
// CURSOR_SMOOTH jitna bada, cursor utna slow aur smooth (ms me, 35-80 try karo)
const CURSOR_SMOOTH = 55;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let cursorX = 0;
let cursorY = 0;
let targetX = 0;
let targetY = 0;
let cursorAnim = null;
let lastFrameTime = 0;
let snapCursor = true;
let lastLineTop = -1;
let renderedLength = 0;
let tabPressed = false;

// line scrolling
let firstTop = 0;
let lineStep = 0;
let scrollY = 0;

// RANDOM WORDS

function pickWords(count) {
    const source = bank[difficulty];
    const words = [];
    let last = "";

    while (words.length < count) {
        const word = source[Math.floor(Math.random() * source.length)];

        if (word !== last) {
            words.push(word);
            last = word;
        }
    }

    return words;
}

// BUILD ONE WORD

function makeWordElement(word, withSpace) {
    const wordElement = document.createElement("span");
    wordElement.className = "word";

    [...word].forEach(character => {
        const letter = document.createElement("span");

        letter.className = "letter";
        letter.textContent = character;

        wordElement.appendChild(letter);
        characterElements.push(letter);
    });

    if (withSpace) {
        const space = document.createElement("span");

        space.className = "letter space";
        space.innerHTML = "&nbsp;";

        wordElement.appendChild(space);
        characterElements.push(space);
    }

    return wordElement;
}

function appendWords(words, lastHasSpace) {
    words.forEach((word, index) => {
        const withSpace = index < words.length - 1 || lastHasSpace;

        wordList.appendChild(makeWordElement(word, withSpace));
        targetText += word + (withSpace ? " " : "");
    });
}

// RENDER WORDS

function renderText() {
    wordList.innerHTML = "";
    characterElements = [];
    targetText = "";
    renderedLength = 0;
    scrollY = 0;
    snapCursor = true;
    lastLineTop = -1;
    wordList.style.transform = "translateY(0)";

    if (mode === "words") {
        appendWords(pickWords(wordCountFor[duration] || 25), false);
    } else {
        appendWords(pickWords(120), true);
    }

    measureLines();
}

// MEASURE LINES (3 lines visible, rest scrolls up smoothly)

function measureLines() {
    if (characterElements.length === 0) return;

    firstTop = characterElements[0].offsetTop;
    lineStep = 0;

    for (const element of characterElements) {
        if (element.offsetTop > firstTop) {
            lineStep = element.offsetTop - firstTop;
            break;
        }
    }

    if (!lineStep) {
        lineStep = characterElements[0].offsetHeight * 1.5;
    }

    wordsArea.style.height = lineStep * 3 + "px";
}

// SMOOTH CURSOR

function paintCursor() {
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
}

function animateCursor(now) {
    const dt = Math.min(now - lastFrameTime, 50);
    lastFrameTime = now;

    // exponential smoothing: fast typing me bhi cursor peeche nahi rehta
    const k = 1 - Math.exp(-dt / CURSOR_SMOOTH);

    cursorX += (targetX - cursorX) * k;
    cursorY += (targetY - cursorY) * k;

    if (Math.abs(targetX - cursorX) < 0.15 && Math.abs(targetY - cursorY) < 0.15) {
        cursorX = targetX;
        cursorY = targetY;
        paintCursor();
        cursorAnim = null;
        return;
    }

    paintCursor();
    cursorAnim = requestAnimationFrame(animateCursor);
}

function moveCursor() {
    if (characterElements.length === 0) return;

    const current = characterElements[typedText.length];
    const element = current || characterElements[characterElements.length - 1];
    const atEnd = !current;

    const wantedScroll = Math.max(0, element.offsetTop - firstTop - lineStep);

    if (wantedScroll !== scrollY) {
        scrollY = wantedScroll;
        wordList.style.transform = `translateY(${-scrollY}px)`;
    }

    targetX = wordList.offsetLeft + element.offsetLeft + (atEnd ? element.offsetWidth : 0);
    targetY = wordList.offsetTop + element.offsetTop - scrollY;

    cursor.style.height = `${element.offsetHeight}px`;

    // nayi line pe cursor poori screen cross na kare, seedha jump kare
    if (element.offsetTop !== lastLineTop) {
        lastLineTop = element.offsetTop;
        snapCursor = true;
    }

    if (snapCursor || reduceMotion) {
        snapCursor = false;
        cursorX = targetX;
        cursorY = targetY;
        paintCursor();
        return;
    }

    if (!cursorAnim) {
        lastFrameTime = performance.now();
        cursorAnim = requestAnimationFrame(animateCursor);
    }
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

// UPDATE LETTER COLORS (only the letters that changed)

function updateLetters() {
    const from = Math.max(0, Math.min(renderedLength, typedText.length) - 1);
    const to = Math.max(renderedLength, typedText.length);

    for (let i = from; i <= to && i < characterElements.length; i++) {
        const letter = characterElements[i];

        letter.classList.remove("correct", "incorrect");

        if (i < typedText.length) {
            letter.classList.add(
                typedText[i] === targetText[i] ? "correct" : "incorrect"
            );
        }
    }

    renderedLength = typedText.length;
    requestCursorMove();
}

// TIMER TEXT (monkeytype jaisa: 01:59 ya 3/25)

function formatTime(totalSeconds) {
    if (totalSeconds < 60) return String(totalSeconds);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function wordTotal() {
    return wordCountFor[duration] || 25;
}

function showProgress() {
    if (mode !== "words") return;

    const done = Math.min(typedText.split(" ").length - 1, wordTotal());
    timerDisplay.textContent = done + "/" + wordTotal();
}

// START TIMER

function startTimer() {
    if (started || finished) return;

    started = true;
    startTime = performance.now();
    wordsArea.classList.add("typing");
    document.body.classList.add("focus");

    timerInterval = setInterval(tick, 50);
}

function tick() {
    const elapsed = (performance.now() - startTime) / 1000;

    if (mode === "time") {
        remaining = Math.max(0, Math.ceil(duration - elapsed));
        timerDisplay.textContent = formatTime(remaining);

        updateStats();

        // time khatam = result turant
        if (elapsed >= duration) {
            finishTest();
        }
    } else {
        updateStats();
    }
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

    let elapsedSeconds = (performance.now() - startTime) / 1000;

    if (mode === "time") {
        elapsedSeconds = Math.min(elapsedSeconds, duration);
    }

    const elapsedMinutes = Math.max(elapsedSeconds / 60, 0.001);

    const wpm = Math.round((correct / 5) / elapsedMinutes);

    const accuracy = typedText.length === 0
        ? 100
        : Math.round((correct / typedText.length) * 100);

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

    if (mode === "time") {
        timerDisplay.textContent = formatTime(0);
    }

    document.body.classList.remove("focus");

    updateStats();

    finalWpm.textContent = wpmDisplay.textContent;
    finalAccuracy.textContent = accuracyDisplay.textContent;

    wordsArea.classList.remove("typing");
    wordsArea.classList.add("done");
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

    timerDisplay.textContent = mode === "time" ? formatTime(duration) : "0/" + wordTotal();

    wpmDisplay.textContent = "0";
    navWpm.textContent = "0";
    accuracyDisplay.textContent = "100%";

    resultBox.classList.add("hidden");
    wordsArea.classList.remove("typing", "done");
    document.body.classList.remove("focus");

    renderText();
    requestCursorMove();

    // focus hamesha input pe, taaki koi bhi key dabate hi typing start ho
    input.focus({ preventScroll: true });
}

// TYPING INPUT

input.addEventListener("input", () => {
    if (finished) return;

    // enter / newline aur lamba text hata do
    let value = input.value.replace(/[\r\n]/g, "");

    if (value.length > targetText.length) {
        value = value.slice(0, targetText.length);
    }

    if (value !== input.value) {
        input.value = value;
    }

    typedText = value;

    if (typedText.length > 0 && !started) {
        startTimer();
    }

    if (started) {
        document.body.classList.add("focus");
    }

    showProgress();

    // time mode me words khatam na hon, isliye aur add karte raho
    if (mode === "time" && targetText.length - typedText.length < 400) {
        appendWords(pickWords(60), true);
    }

    updateLetters();

    if (mode === "words" && typedText.length === targetText.length) {
        finishTest();
    }
});

input.addEventListener("paste", event => event.preventDefault());

// CLICK TO FOCUS

wordsArea.addEventListener("click", () => {
    if (!finished) {
        input.focus({ preventScroll: true });
    }
});

// KEYBOARD: koi bhi key dabao, typing start + shortcuts

document.addEventListener("keydown", event => {

    if (event.key === "Tab") {
        event.preventDefault();
        tabPressed = true;
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        tabPressed = false;
        resetTest();
        return;
    }

    // tab + enter ya result screen pe enter = restart
    if (event.key === "Enter") {
        event.preventDefault();

        if (tabPressed || finished) {
            tabPressed = false;
            resetTest();
        }

        return;
    }

    tabPressed = false;

    if (finished || event.ctrlKey || event.metaKey || event.altKey) return;

    // input focus me nahi hai to focus kar do, key usi me type hogi
    if (
        document.activeElement !== input &&
        (event.key.length === 1 || event.key === "Backspace")
    ) {
        input.focus({ preventScroll: true });
    }
});

// MOUSE HILAO TO MENU WAPAS AA JAYE

document.addEventListener("mousemove", event => {
    if (started && Math.abs(event.movementX) + Math.abs(event.movementY) > 2) {
        document.body.classList.remove("focus");
    }
});

// RESTART BUTTONS

restartButton.addEventListener("click", resetTest);
tryAgainButton.addEventListener("click", resetTest);

// BUTTON LABELS (words mode me 10/25/50/100 words)

function refreshDurationLabels() {
    document.querySelectorAll(".duration").forEach(button => {
        const seconds = Number(button.dataset.time);

        button.textContent = mode === "words" ? wordCountFor[seconds] : seconds;
        button.setAttribute("aria-pressed", button.classList.contains("active"));
    });
}

// MODE SELECTION

document.querySelectorAll(".mode").forEach(button => {
    button.addEventListener("click", () => {

        document.querySelectorAll(".mode").forEach(item => {
            item.classList.remove("active");
            item.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        mode = button.dataset.mode;

        refreshDurationLabels();
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

        refreshDurationLabels();
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
    measureLines();
    scrollY = 0;
    snapCursor = true;
    wordList.style.transform = "translateY(0)";
    requestCursorMove();
});

// INITIALIZE WEBSITE

refreshDurationLabels();
resetTest();
