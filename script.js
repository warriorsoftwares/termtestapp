/* 
   MASTER'S QUIZZES PRO - FINAL PROJECT LOGIC 
   Supports: questions.json
*/

let masterQuestionBank = {}; 
let shuffled = [], current = 0, score = 0, isAnswered = false, timer;
let timeLeft = 5, selectedSubj = "", difficultyTime = 5, sessionLimit = 100;

// 1. INITIALIZATION & SPLASH SCREEN
window.onload = () => { 
    // Set initial history state to menu instead of login
    history.replaceState({ screen: 'menu-screen' }, "", "");
    
    setTimeout(() => { 
        const start = document.getElementById('start-screen');
        if(start) {
            start.style.transition = "opacity 0.5s";
            start.style.opacity = "0";
            setTimeout(() => {
                start.style.display = "none";
                showScreen('menu-screen', true); // Skip login-screen
            }, 500);
        }
    }, 4000); 
};

// 2. NAVIGATION & SCREEN CONTROL
function showScreen(screenId, isBack = false) {
    const currentScreen = document.querySelector('.screen.active');
    const targetScreen = document.getElementById(screenId);

    if (currentScreen) {
        currentScreen.classList.add('fade-out');
        setTimeout(() => {
            currentScreen.classList.remove('active', 'fade-out');
            currentScreen.style.display = "none";
            if(targetScreen) {
                targetScreen.style.display = "flex";
                targetScreen.classList.add('active');
            }
        }, 300);
    } else {
        document.querySelectorAll('.screen').forEach(s => {
            s.style.display = "none";
            s.classList.remove('active');
        });
        if(targetScreen) {
            targetScreen.style.display = "flex";
            targetScreen.classList.add('active');
        }
    }
    if (!isBack) history.pushState({ screen: screenId }, "", "");
}

// 3. SETTINGS (Login functions removed)
function toggleSettings(show) {
    const overlay = document.getElementById('settings-overlay');
    if(overlay) overlay.style.display = show ? "flex" : "none";
    if (!show) {
        difficultyTime = parseInt(document.getElementById('diff-select').value) || 5;
        sessionLimit = parseInt(document.getElementById('limit-select').value) || 100;
    }
}

// 4. QUIZ FLOW
function goHome() { showScreen('menu-screen'); }
function showGrades() { showScreen('grade-screen'); }
function selectGrade(grade) { showScreen('subject-screen'); }
function showTerms(subj) { selectedSubj = subj; showScreen('term-screen'); }

async function startGame(term) {
    try {
        // [MODIFIED: Single JSON file connection]
        const response = await fetch("questions.json");
        if (!response.ok) throw new Error("File not found");

        const fullBank = await response.json();
        
        // Logical check: Term -> Subject -> Question Array
        let currentQuestions = [];
        if (fullBank[term] && fullBank[term][selectedSubj]) {
            currentQuestions = fullBank[term][selectedSubj];
        }

        if (currentQuestions.length === 0) {
            alert(`No questions found for ${selectedSubj} in ${term}!`);
            showScreen('subject-screen');
            return;
        }

        showScreen('quiz-container');
        document.getElementById('active-subj').innerText = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "I.C.T." : selectedSubj;

        shuffled = [...currentQuestions].sort(() => Math.random() - 0.5).slice(0, sessionLimit); 
        current = 0; score = 0;
        loadQuestion();
    } catch (error) {
        console.error("JSON Error:", error);
        alert("questions.json missing or formatted incorrectly!");
    }
}

// 5. CORE QUIZ LOGIC (Includes skip-prevention fix)
function loadQuestion() {
    isAnswered = false;
    document.getElementById('main-submit').style.visibility = "visible";
    document.getElementById('feedback').innerText = "";
    
    const data = shuffled[current];
    document.getElementById('q-idx').innerText = current + 1;
    document.getElementById('q-text').innerText = data.q;
    
    for(let i=0; i<4; i++) {
        const radio = document.getElementById(`o${i}`);
        const textSpan = document.getElementById(`t${i}`);
        if(textSpan) {
            textSpan.innerText = data.options[i];
            textSpan.classList.remove('correct-text', 'wrong-text');
        }
        if(radio) { radio.checked = false; radio.disabled = false; }
    }
    startTimer();
}

function startTimer() {
    clearInterval(timer); 
    timeLeft = difficultyTime;
    const timerBox = document.getElementById('timer-box');
    timerBox.innerText = `Time: ${timeLeft < 10 ? '0' + timeLeft : timeLeft}s`;
    
    timer = setInterval(() => {
        timeLeft--;
        timerBox.innerText = `Time: ${timeLeft < 10 ? '0' + timeLeft : timeLeft}s`;
        if(timeLeft <= 0) { 
            clearInterval(timer); 
            highlightCorrect(); 
            let msg = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "Time's Up!" : "කාලය අවසන්!";
            handleEnd(msg, false); 
        }
    }, 1000);
}

function check() {
    if(isAnswered) return;
    let sel = -1;
    for(let i=0; i<4; i++) { if(document.getElementById(`o${i}`).checked) sel = i; }
    
    if(sel === -1) {
        const f = document.getElementById('feedback');
        f.innerText = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "Select an answer!" : "පිළිතුරක් තෝරන්න!";
        f.style.color = "var(--error-red)";
        return;
    }

    clearInterval(timer);
    const cor = shuffled[current].correct;
    const targetText = document.getElementById(`t${sel}`);
    
    if(sel === cor) { 
        score++; 
        if(targetText) targetText.classList.add('correct-text'); 
        handleEnd((selectedSubj === "තොරතුරු තාක්ෂණය") ? "Correct! ✅" : "නිවැරදියි! ✅", true); 
    } 
    else { 
        if(targetText) targetText.classList.add('wrong-text'); 
        highlightCorrect(); 
        handleEnd((selectedSubj === "තොරතුරු තාක්ෂණය") ? "Wrong! ❌" : "වැරදියි! ❌", false); 
    }
}

function highlightCorrect() {
    const cor = shuffled[current].correct;
    const corText = document.getElementById(`t${cor}`);
    if(corText) corText.classList.add('correct-text');
}

function handleEnd(msg, isCorrect) {
    if(isAnswered) return; // Anti-skip protection
    isAnswered = true;
    document.getElementById('main-submit').style.visibility = "hidden";
    for(let i=0; i<4; i++) {
        const radio = document.getElementById(`o${i}`);
        if(radio) radio.disabled = true;
    }
    
    const f = document.getElementById('feedback');
    f.innerText = msg; 
    f.style.color = isCorrect ? "var(--success-green)" : "var(--error-red)";
    
    document.getElementById('live-score').innerText = Math.round((score / (current + 1)) * 100) + "%";
    
    setTimeout(() => {
        current++;
        if(current < shuffled.length) { 
            loadQuestion(); 
        } else { 
            showScreen('result-screen'); 
            document.getElementById('final-score').innerText = Math.round((score / shuffled.length) * 100) + "%"; 
        }
    }, 2000);
}

function handleBackRequest() {
    let msg = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "Exit quiz?" : "ප්‍රශ්නාවලියෙන් ඉවත් වෙනවාද?";
    if (confirm(msg)) showScreen('subject-screen');
}
