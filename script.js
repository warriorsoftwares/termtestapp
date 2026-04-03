

let masterQuestionBank = {}; 
let shuffled = [], current = 0, score = 0, isAnswered = false, timer;
let timeLeft = 5, selectedSubj = "", difficultyTime = 5, sessionLimit = 100;

window.onload = () => { 
    history.replaceState({ screen: 'menu-screen' }, "", "");
    setTimeout(() => { 
        const start = document.getElementById('start-screen');
        if(start) {
            start.style.transition = "opacity 0.5s";
            start.style.opacity = "0";
            setTimeout(() => {
                start.style.display = "none";
                showScreen('menu-screen', true); 
            }, 500);
        }
    }, 4000); 
};

window.onpopstate = function(event) {
    const quizScreen = document.getElementById('quiz-container');
    if (quizScreen && quizScreen.classList.contains('active')) {
        if (confirm(selectedSubj === "තොරතුරු තාක්ෂණය" ? "Exit quiz and lose progress?" : "ප්‍රශ්නාවලියෙන් ඉවත් වී ඔබගේ ප්‍රගතිය අහිමි කරගන්නවාද?")) {
            showScreen('menu-screen');
        } else {
            history.pushState({ screen: 'quiz-container' }, "", "");
        }
        return;
    }
    if (event.state && event.state.screen) {
        showScreen(event.state.screen, true);
    } else {
        showScreen('menu-screen', true);
    }
};

function handleBackRequest() {
    let msg = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "Exit quiz? Progress will be lost." : "ප්‍රශ්නාවලියෙන් ඉවත් වෙනවාද? ප්‍රගතිය අහිමි වනු ඇත.";
    if (confirm(msg)) {
        showScreen('term-screen');
    }
}

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

function toggleSettings(show) {
    const overlay = document.getElementById('settings-overlay');
    if(overlay) overlay.style.display = show ? "flex" : "none";
    if (!show) {
        difficultyTime = parseInt(document.getElementById('diff-select').value) || 5;
        sessionLimit = parseInt(document.getElementById('limit-select').value) || 100;
    }
}

function goHome() { showScreen('menu-screen'); }
function showGrades() { showScreen('grade-screen'); }
function selectGrade() { showScreen('subject-screen'); }

function showTerms(subj) { 
    if(subj) selectedSubj = subj; 
    showScreen('term-screen'); 
}

async function startGame() {
    try {
        const response = await fetch('questions.json');
        masterQuestionBank = await response.json();
        let currentQuestions = masterQuestionBank[selectedSubj] || [];

        if (currentQuestions.length === 0) {
            let errorMsg = (selectedSubj === "තොරතුරු තාක්ෂණය") ? `No questions found for ICT!` : `'${selectedSubj}' විෂයට අදාළ ප්‍රශ්න හමු නොවීය!`;
            alert(errorMsg);
            showScreen('subject-screen');
            return;
        }

        showScreen('quiz-container');
        document.getElementById('active-subj').innerText = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "I.C.T." : selectedSubj;

        let tempShuffled = [...currentQuestions].sort(() => Math.random() - 0.5);
        shuffled = tempShuffled.slice(0, sessionLimit); 
        current = 0; score = 0;
        loadQuestion();
    } catch (error) {
        console.error("Error loading JSON:", error);
        alert("JSON file loading error!");
    }
}

function loadQuestion() {
    isAnswered = false;
    const submitBtn = document.getElementById('main-submit');
    if(submitBtn) submitBtn.style.visibility = "visible";
    document.getElementById('feedback').innerText = "";
    
    const data = shuffled[current];
    document.getElementById('q-idx').innerText = current + 1;
    document.getElementById('q-text').innerText = data.q;
    
    const labels = document.querySelectorAll('.opt-row');
    const texts = document.querySelectorAll('.yasiru');
    
    labels.forEach((label, i) => {
        if(texts[i]) {
            texts[i].innerText = data.options[i];
            texts[i].classList.remove('correct-text', 'wrong-text');
        }
        const radio = document.getElementById(`o${i}`);
        if(radio) { radio.checked = false; radio.disabled = false; }
    });
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
            let timeUpMsg = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "Time's Up!" : "කාලය අවසන්!";
            handleEnd(timeUpMsg, false); 
        }
    }, 1000);
}

function check() {
    if(isAnswered) return;
    let sel = -1;
    for(let i=0; i<4; i++) { if(document.getElementById(`o${i}`).checked) sel = i; }
    
    if(sel === -1) {
        const f = document.getElementById('feedback');
        f.innerText = (selectedSubj === "තොරතුරු තාක්ෂණය") ? "Please select an answer!" : "කරුණාකර පිළිතුරක් තෝරන්න!";
        f.style.color = "var(--error-red)";
        return;
    }

    clearInterval(timer);
    const cor = shuffled[current].correct;
    const texts = document.querySelectorAll('.yasiru');
    
    if(sel === cor) { 
        score++; 
        if(texts[sel]) texts[sel].classList.add('correct-text'); 
        handleEnd((selectedSubj === "තොරතුරු තාක්ෂණය") ? "Correct! ✅" : "නිවැරදියි! ✅", true); 
    } 
    else { 
        if(texts[sel]) texts[sel].classList.add('wrong-text'); 
        highlightCorrect(); 
        handleEnd((selectedSubj === "තොරතුරු තාක්ෂණය") ? "Wrong Answer! ❌" : "වැරදියි! ❌", false); 
    }
}

function highlightCorrect() {
    const cor = shuffled[current].correct;
    const texts = document.querySelectorAll('.yasiru');
    if(texts[cor]) texts[cor].classList.add('correct-text');
}

function handleEnd(msg, isCorrect) {
    isAnswered = true;
    const submitBtn = document.getElementById('main-submit');
    if(submitBtn) submitBtn.style.visibility = "hidden";
    for(let i=0; i<4; i++) {
        const radio = document.getElementById(`o${i}`);
        if(radio) radio.disabled = true;
    }
    const f = document.getElementById('feedback');
    f.innerText = msg; 
    f.style.color = isCorrect ? "var(--success-green)" : "var(--error-red)";
    
    setTimeout(() => {
        current++;
        if(current < shuffled.length) { 
            loadQuestion(); 
            document.getElementById('live-score').innerText = Math.round((score/shuffled.length)*100) + "%"; 
        } else { 
            showScreen('result-screen'); 
            document.getElementById('final-score').innerText = Math.round((score/shuffled.length)*100) + "%"; 
        }
    }, 2000);
}
