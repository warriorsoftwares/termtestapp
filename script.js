let masterData = {}; 
let shuffled = [], current = 0, score = 0, isAnswered = false, timer;
let timeLeft = 5, selectedGrade = "", selectedSubj = "", difficultyTime = 5, sessionLimit = 100;
let selectedMode = ""; // (වෙනස් කළා) - Selected Game Mode variable

// 1. INITIALIZATION (වෙනස් කළා)
window.onload = () => { 
    // diddy.html එකෙන් එන URL එක පරීක්ෂා කිරීම
    const urlParams = new URLSearchParams(window.location.search);
    const screenToLoad = urlParams.get('screen');

    history.replaceState({ screen: 'login-screen' }, "", "");
    setTimeout(() => { 
        const start = document.getElementById('start-screen');
        if(start) {
            start.style.transition = "opacity 0.5s";
            start.style.opacity = "0";
            setTimeout(() => {
                start.style.display = "none";
                
                // (වෙනස් කළා) Back button එකෙන් ආවා නම් කෙලින්ම Mode screen එක පෙන්වයි
                if(screenToLoad === 'mode-screen') {
                    showScreen('mode-screen', true);
                } else {
                    showScreen('login-screen', true); 
                }
            }, 300);
        }
    }, 1500); 
};

// 2. NAVIGATION
function showScreen(screenId, isBack = false) {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(screenId);

    screens.forEach(s => {
        s.style.display = "none";
        s.classList.remove('active');
    });

    if(targetScreen) {
        targetScreen.style.display = "flex";
        targetScreen.classList.add('active');
    }
    if (!isBack) history.pushState({ screen: screenId }, "", "");
}

// 3. LOGIN
async function handleLogin() {
    const u = document.getElementById("usernameField").value;
    const p = document.getElementById("passwordField").value;
    const feedback = document.getElementById("login-feedback");

    try {
        const response = await fetch('./users.json'); 
        const data = await response.json();
        const account = data.accounts.find(acc => acc.user === u && acc.pass === p);

        if (account) {
            showScreen('menu-screen');
        } else {
            feedback.innerText = "Invalid Username or Password!";
            feedback.style.color = "red";
        }
    } catch (e) {
        console.error(e);
        alert("Check if users.json exists in your folder!");
    }
}

// 4. QUIZ FLOW
function goHome() { showScreen('menu-screen'); }
function showGrades() { showScreen('grade-screen'); }
function selectGrade(grade) { selectedGrade = grade; showScreen('subject-screen'); }
function showTerms(subj) { selectedSubj = subj; showScreen('term-screen'); }

// (වෙනස් කළා) - Function to handle Game Mode Selection
function selectGameMode(mode) {
    selectedMode = mode;
    showScreen('grade-screen');
}

function toggleSettings(show) {
    const overlay = document.getElementById('settings-overlay');
    if(show) {
        overlay.style.display = 'flex';
    } else {
        // 1. Get values from the dropdowns
        difficultyTime = parseInt(document.getElementById('diff-select').value);
        sessionLimit = parseInt(document.getElementById('limit-select').value);
        
        // 2. Save them to browser memory (localStorage)
        localStorage.setItem('master_quiz_time', difficultyTime);
        localStorage.setItem('master_quiz_limit', sessionLimit);
        
        // 3. Hide the overlay
        overlay.style.display = 'none';
        console.log("Settings Saved: " + difficultyTime + "s per question.");
    }
}

async function startGame(term) {
    try {
        const response = await fetch("master_data.json");
        masterData = await response.json();

        const subjectMap = {
            "විද්‍යාව": "Science", "ඉතිහාසය": "History", "භූගෝල විද්‍යාව": "Geography",
            "ගණිතය": "Mathematics", "I.C.T": "I.C.T.", "තොරතුරු තාක්ෂණය": "I.C.T.",
            "සිංහල": "Sinhala", "බුද්ධ ධර්මය": "Buddhism"
        };

        const jsonKey = subjectMap[selectedSubj] || selectedSubj;
        const questions = masterData[selectedGrade] && masterData[selectedGrade][term] ? masterData[selectedGrade][term][jsonKey] : [];

        if (!questions || questions.length === 0) {
            alert("No questions found for this selection!");
            return;
        }

        shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, sessionLimit);
        current = 0; score = 0;
        document.getElementById('active-subj').innerText = selectedSubj;
        showScreen('quiz-container');
        loadQuestion();
    } catch (e) { alert("Error loading master_data.json"); }
}

// 5. CORE QUIZ
function loadQuestion() {
    isAnswered = false;
    document.getElementById('main-submit').style.visibility = "visible";
    document.getElementById('feedback').innerText = "";
    
    const data = shuffled[current];
    document.getElementById('q-idx').innerText = current + 1;
    document.getElementById('q-text').innerText = data.q;
    
    for(let i=0; i<4; i++) {
        const r = document.getElementById(`o${i}`);
        const t = document.getElementById(`t${i}`);
        t.innerText = data.options[i];
        t.classList.remove('correct-text', 'wrong-text');
        r.checked = false; r.disabled = false;
    }
    startTimer();
}

function startTimer() {
    clearInterval(timer); 
    timeLeft = difficultyTime;
    const box = document.getElementById('timer-box');
    box.innerText = `Time: ${timeLeft}s`;
    
    timer = setInterval(() => {
        timeLeft--;
        box.innerText = `Time: ${timeLeft}s`;
        if(timeLeft <= 0) { 
            clearInterval(timer); 
            highlightCorrect(); 
            handleEnd("Time's Up!", false); 
        }
    }, 1000);
}

function check() {
    if(isAnswered) return;
    let sel = -1;
    for(let i=0; i<4; i++) { if(document.getElementById(`o${i}`).checked) sel = i; }
    
    if(sel === -1) return;

    clearInterval(timer);
    const cor = shuffled[current].correct;
    if(sel === cor) { 
        score++; 
        document.getElementById(`t${sel}`).classList.add('correct-text'); 
        handleEnd("Correct! ✅", true); 
    } else { 
        document.getElementById(`t${sel}`).classList.add('wrong-text'); 
        highlightCorrect(); 
        handleEnd("Wrong! ❌", false); 
    }
}

function highlightCorrect() {
    const cor = shuffled[current].correct;
    document.getElementById(`t${cor}`).classList.add('correct-text');
}

function handleEnd(msg, isCorrect) {
    isAnswered = true;
    document.getElementById('main-submit').style.visibility = "hidden";
    document.querySelectorAll('input[name="opt"]').forEach(r => r.disabled = true);
    
    const f = document.getElementById('feedback');
    f.innerText = msg; 
    f.style.color = isCorrect ? "green" : "red";
    
    document.getElementById('live-score').innerText = Math.round((score / (current + 1)) * 100) + "%";
    
    setTimeout(() => {
        current++;
        if(current < shuffled.length) loadQuestion(); 
        else {
            showScreen('result-screen');
            document.getElementById('final-score').innerText = Math.round((score / shuffled.length) * 100) + "%";
        }
    }, 1500);
}

function handleBackRequest() {
    if(confirm("Exit Quiz?")) showScreen('subject-screen');
}

function generateJSON() {
    const q = document.getElementById('adm-q').value;
    const options = [
        document.getElementById('adm-o0').value,
        document.getElementById('adm-o1').value,
        document.getElementById('adm-o2').value,
        document.getElementById('adm-o3').value
    ];
    const correct = parseInt(document.getElementById('adm-cor').value);
    const output = { q, options, correct };
    document.getElementById('json-output').value = JSON.stringify(output) + ",";
}
