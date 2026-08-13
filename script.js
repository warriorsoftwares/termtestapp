let masterData = {}; 
let shuffled = [], current = 0, score = 0, isAnswered = false, timer;
let timeLeft = 5, selectedGrade = "", selectedSubj = "", difficultyTime = 5, sessionLimit = 100;
let selectedMode = ""; 
let isQuizActive = false; 

// ========== SUPABASE CONNECTION ==========
const SUPABASE_URL = 'https://eiyeimfuogqwitbelcpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeWVpbWZ1b2dxd2l0YmVsY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MjA0NDAsImV4cCI6MjEwMTk5NjQ0MH0.rLlmoY5icyyWp9o3vqJaMyoFi9H5-uugmYQanAg6N_w';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. INITIALIZATION
window.addEventListener('DOMContentLoaded', () => { 
    const urlParams = new URLSearchParams(window.location.search);
    const screenToLoad = urlParams.get('screen');
    const loginScreenExist = document.getElementById('login-screen');

    history.replaceState({ screen: loginScreenExist ? 'login-screen' : 'dhamma-screen' }, "", "");
    
    setTimeout(() => { 
        const start = document.getElementById('start-screen');
        if(start) {
            start.style.transition = "opacity 0.5s";
            start.style.opacity = "0";
            setTimeout(() => {
                start.style.display = "none";

                if(screenToLoad === 'mode-screen') {
                    showScreen('mode-screen', true);
                } else {
                    if (loginScreenExist) {
                        showScreen('login-screen', true); 
                    } else {
                        showScreen('dhamma-screen', true);
                    }
                }
            }, 375);
        }
    }, 1650);

    // Load profile letter if name exists
    const savedName = localStorage.getItem('mq_name');
    if (savedName) {
        updateProfileCircle(savedName);
    }

    // Coming from Past Papers
    if (urlParams.get('from') === 'pastpapers') {
        const highestTimeoutId = setTimeout(";");
        for (let i = 0; i < highestTimeoutId; i++) {
            clearTimeout(i);
        }

        const startScreen = document.getElementById('start-screen');
        const loginScreen = document.getElementById('login-screen');

        if (startScreen) {
            startScreen.style.display = 'none';
            startScreen.style.opacity = '0';
        }
        if (loginScreen) {
            loginScreen.style.display = 'none';
            loginScreen.style.opacity = '0';
        }

        showScreen('menu-screen');
        history.replaceState(null, '', 'index.html');
    }
});

// Browser closing protection
window.addEventListener('beforeunload', (e) => {
    if (isQuizActive) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit the quiz? Your score progress will be lost.";
        return e.returnValue;
    }
});

// 2. NAVIGATION
function showScreen(screenId, isBack = false) {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(screenId);
    const currentActive = document.querySelector('.screen.active');

    if (currentActive && targetScreen && currentActive !== targetScreen) {
        currentActive.classList.remove('active');
        setTimeout(() => {
            currentActive.style.display = 'none';
            targetScreen.style.display = 'flex';
            setTimeout(() => targetScreen.classList.add('active'), 50);
        }, 400);
    } else {
        screens.forEach(s => {
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

// 3. AUTH SYSTEM
async function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const feedback = document.getElementById('signup-feedback');

    if (!email || !password) {
        feedback.innerText = "Please fill all fields";
        feedback.style.color = "red";
        return;
    }
    if (password !== confirm) {
        feedback.innerText = "Passwords do not match";
        feedback.style.color = "red";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        feedback.innerText = error.message;
        feedback.style.color = "red";
    } else {
        feedback.innerText = "Account created! Check your email to confirm.";
        feedback.style.color = "green";
        setTimeout(() => {
            showScreen('name-screen');
        }, 1500);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const feedback = document.getElementById('login-feedback');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        feedback.innerText = error.message;
        feedback.style.color = "red";
        return;
    }

    // Check if name already exists in profiles table
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('name')
        .eq('email', email)
        .single();

    if (profile && profile.name) {
        localStorage.setItem('mq_name', profile.name);
        updateProfileCircle(profile.name);
        showScreen('menu-screen');
    } else {
        showScreen('name-screen');
    }
}

async function saveUserName() {
    const name = document.getElementById('userNameField').value.trim();
    if (!name) {
        alert("Please enter your name");
        return;
    }

    // Get current logged-in user
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("You are not logged in");
        return;
    }

    // Save name + email to profiles table
    const { error } = await supabaseClient
        .from('profiles')
        .upsert({
            email: user.email,
            name: name
        });

    if (error) {
        console.error(error);
        alert("Error saving name: " + error.message);
        return;
    }

    // Also save in localStorage for quick access
    localStorage.setItem('mq_name', name);
    updateProfileCircle(name);
    showScreen('menu-screen');
}

function updateProfileCircle(name) {
    const circle = document.getElementById('profile-circle');
    if (circle && name) {
        circle.innerText = name.charAt(0).toUpperCase();
    }
}

function showHighScores() {
    const list = document.getElementById('highscores-list');
    list.innerHTML = "<p style='text-align:center; font-weight:700;'>No scores yet.<br>Play quizzes to see high scores here.</p>";
    showScreen('highscores-screen');
}

// 4. QUIZ FLOW
function goHome() { 
    showScreen('menu-screen'); 
}

function showGrades() { 
    showScreen('grade-screen'); 
}

function selectGrade(grade) { 
    selectedGrade = grade; 
    if (document.getElementById('subject-screen')) {
        showScreen('subject-screen'); 
    } else if (document.getElementById('term-screen')) {
        showScreen('term-screen');
    }
}

function showTerms(subj) { 
    selectedSubj = subj; 
    showScreen('term-screen'); 
}

function selectGameMode(mode) {
    selectedMode = mode;
    showScreen('grade-screen');
}

function toggleSettings(show) {
    const overlay = document.getElementById('settings-overlay');
    if(show) {
        overlay.style.display = 'flex';
    } else {
        difficultyTime = parseInt(document.getElementById('diff-select').value);
        sessionLimit = parseInt(document.getElementById('limit-select').value);
        localStorage.setItem('master_quiz_time', difficultyTime);
        localStorage.setItem('master_quiz_limit', sessionLimit);
        overlay.style.display = 'none';
    }
}

async function startGame(term) {
    try {
        const isDhamma = !document.getElementById('subject-screen');
        const dataFile = isDhamma ? "edu.json" : "master_data.json";

        const response = await fetch(dataFile);
        masterData = await response.json();

        let questions = [];
        if (isDhamma) {
            questions = (masterData[selectedGrade] && masterData[selectedGrade][term]) ? masterData[selectedGrade][term] : [];
        } else {
            const subjectMap = {
                "විද්‍යාව": "Science", 
                "ඉතිහාසය": "History", 
                "භූගෝල විද්‍යාව": "Geography",
                "ගණිතය": "Mathematics", 
                "I.C.T": "I.C.T.", 
                "තොරතුරු තාක්ෂණය": "I.C.T.",
                "සිංහල": "Sinhala", 
                "බුද්ධ ධර්මය": "Buddhism"
            };
            const jsonKey = subjectMap[selectedSubj] || selectedSubj;
            questions = masterData[selectedGrade] && masterData[selectedGrade][term] ? masterData[selectedGrade][term][jsonKey] : [];
        }

        if (!questions || questions.length === 0) {
            alert("No questions found for this selection!");
            return;
        }

        shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, sessionLimit);
        current = 0; 
        score = 0;
        isQuizActive = true;

        const titleObj = document.getElementById('active-subj') || document.getElementById('active-title');
        if (titleObj) titleObj.innerText = isDhamma ? "Dhamma Quiz" : selectedSubj;

        showScreen('quiz-container');
        loadQuestion();
    } catch (e) { 
        console.error(e);
        alert("Error loading data file! Make sure master_data.json or edu.json exists."); 
    }
}

// 5. CORE QUIZ
function loadQuestion() {
    isAnswered = false;
    document.getElementById('main-submit').style.visibility = "visible";
    document.getElementById('feedback').innerText = "";

    const data = shuffled[current];
    document.getElementById('q-idx').innerText = current + 1;
    document.getElementById('q-text').innerText = data.q;

    for(let i = 0; i < 4; i++) {
        const r = document.getElementById(`o${i}`);
        const t = document.getElementById(`t${i}`);
        t.innerText = data.options[i];
        t.classList.remove('correct-text', 'wrong-text');
        r.checked = false; 
        r.disabled = false;
    }
    startTimer();
}

function startTimer() {
    clearInterval(timer); 
    const savedTime = localStorage.getItem('master_quiz_time');
    difficultyTime = savedTime ? parseInt(savedTime) : difficultyTime;
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
    for(let i = 0; i < 4; i++) { 
        if(document.getElementById(`o${i}`).checked) sel = i; 
    }

    if(sel === -1) return;

    clearInterval(timer);
    const cor = shuffled[current].ans;
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
    const cor = shuffled[current].ans;
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
        if(current < shuffled.length) {
            loadQuestion(); 
        } else {
            isQuizActive = false;
            showScreen('result-screen');
            const scoreDisplay = document.getElementById('final-score') || document.getElementById('final-score-val');
            if (scoreDisplay) {
                scoreDisplay.innerText = Math.round((score / shuffled.length) * 100) + "%";
            }
        }
    }, 1650);
}

function handleBackRequest() {
    if(confirm("Exit Quiz?")) {
        isQuizActive = false;
        if (document.getElementById('subject-screen')) {
            showScreen('subject-screen');
        } else {
            location.reload();
        }
    }
}

function generateJSON() {
    const q = document.getElementById('adm-q').value;
    const options = [
        document.getElementById('adm-o0').value,
        document.getElementById('adm-o1').value,
        document.getElementById('adm-o2').value,
        document.getElementById('adm-o3').value
    ];
    const ans = parseInt(document.getElementById('adm-cor').value);
    const output = { q, options, ans };
    document.getElementById('json-output').value = JSON.stringify(output) + ",";
}

// 6. GLOBAL WINDOW MAPPINGS
window.showScreen = showScreen;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.saveUserName = saveUserName;
window.showHighScores = showHighScores;
window.showGrades = showGrades;
window.selectGrade = selectGrade;
window.showTerms = showTerms;
window.startGame = startGame;
window.selectGameMode = selectGameMode;
window.toggleSettings = toggleSettings;
window.check = check;
window.handleBackRequest = handleBackRequest;
window.generateJSON = generateJSON;
window.goHome = goHome;