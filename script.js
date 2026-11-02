let masterData = {};
let shuffled = [], current = 0, score = 0, isAnswered = false, timer;
let timeLeft = 5, selectedGrade = "", selectedSubj = "", difficultyTime = 5, sessionLimit = 100;
let selectedMode = "";
let isQuizActive = false;
let currentTerm = "";

const SUPABASE_URL = 'https://eiyeimfuogqwitbelcpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeWVpbWZ1b2dxd2l0YmVsY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MjA0NDAsImV4cCI6MjEwMTk5NjQ0MH0.rLlmoY5icyyWp9o3vqJaMyoFi9H5-uugmYQanAg6N_w';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let deferredPrompt = null;
let installPopupReady = false;

// Age roller state
let ageList = [];
let userChangedGrade = false;
const AGE_ITEM_H = 56;

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const screenToLoad = urlParams.get('screen');
    const loginScreenExist = document.getElementById('login-screen');

    history.replaceState({ screen: loginScreenExist ? 'login-screen' : 'dhamma-screen' }, "", "");

    const savedTheme = localStorage.getItem("mq_theme") || "classic";
    applyTheme(savedTheme);

    initProfileForm();

    setTimeout(() => {
        const start = document.getElementById('start-screen');
        if (start) {
            start.style.transition = "opacity 0.4s";
            start.style.opacity = "0";
            setTimeout(() => {
                start.style.display = "none";
                if (screenToLoad === 'mode-screen') {
                    showScreen('mode-screen', true);
                } else if (loginScreenExist) {
                    showScreen('login-screen', true);
                } else {
                    showScreen('dhamma-screen', true);
                }
            }, 400);
        }
    }, 3000);

    const savedName = localStorage.getItem('mq_username') || localStorage.getItem('mq_name');
    if (savedName) updateProfileCircle(savedName);

    if (urlParams.get('from') === 'pastpapers' || urlParams.get('from') === 'privacy') {
        const highestTimeoutId = setTimeout(";");
        for (let i = 0; i < highestTimeoutId; i++) clearTimeout(i);

        const startScreen = document.getElementById('start-screen');
        const loginScreen = document.getElementById('login-screen');
        if (startScreen) { startScreen.style.display = 'none'; startScreen.style.opacity = '0'; }
        if (loginScreen) { loginScreen.style.display = 'none'; loginScreen.style.opacity = '0'; }

        showScreen('menu-screen');
        history.replaceState(null, '', 'index.html');
    }

    const photoBtn = document.getElementById('photoLinkBtn');
    const avatarFile = document.getElementById('avatarFile');
    if (photoBtn && avatarFile) {
        photoBtn.addEventListener('click', () => avatarFile.click());
        avatarFile.addEventListener('change', () => {
            alert('Profile photo upload will be enabled in a later update.');
            avatarFile.value = '';
        });
    }
});

window.addEventListener('beforeunload', (e) => {
    if (isQuizActive) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit the quiz? Your score progress will be lost.";
        return e.returnValue;
    }
});

/* ========== PROFILE FORM ========== */

function gradeFromAge(age, countryCode) {
    age = parseInt(age, 10);
    if (countryCode === 'IN') {
        if (age <= 5) return 1;
        if (age >= 17) return 12;
        return Math.min(12, age - 5);
    }
    if (countryCode === 'SE') {
        if (age <= 6) return 1;
        if (age <= 15) return age - 6;
        if (age <= 18) return Math.min(12, 9 + (age - 15));
        return 13;
    }
    if (age <= 5) return 1;
    if (age >= 18) return 13;
    return Math.min(13, age - 5);
}

function initProfileForm() {
    const roller = document.getElementById('ageRoller');
    const gradeSelect = document.getElementById('gradeSelect');
    const countrySelect = document.getElementById('countrySelect');
    const flagBox = document.getElementById('flagBox');
    const ageValue = document.getElementById('ageValue');

    if (!roller || !gradeSelect) return;

    ageList = [];
    for (let i = 5; i <= 20; i++) ageList.push(i);

    roller.innerHTML = '';
    ageList.forEach((a) => {
        const div = document.createElement('div');
        div.className = 'roller-item';
        div.textContent = a;
        div.style.cssText = 'height:56px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#1c15ff;scroll-snap-align:center;flex-shrink:0;';
        roller.appendChild(div);
    });

    gradeSelect.innerHTML = '';
    for (let g = 1; g <= 13; g++) {
        const opt = document.createElement('option');
        opt.value = String(g);
        opt.textContent = 'Grade ' + g;
        gradeSelect.appendChild(opt);
    }

    function currentAge() {
        const index = Math.round(roller.scrollTop / AGE_ITEM_H);
        const clamped = Math.max(0, Math.min(ageList.length - 1, index));
        return ageList[clamped];
    }

    function applyAutoGrade() {
        if (userChangedGrade) return;
        const code = countrySelect ? countrySelect.value : 'LK';
        const g = gradeFromAge(currentAge(), code);
        gradeSelect.value = String(g);
        if (ageValue) ageValue.textContent = currentAge();
    }

    function snapAge() {
        const index = Math.round(roller.scrollTop / AGE_ITEM_H);
        const clamped = Math.max(0, Math.min(ageList.length - 1, index));
        roller.scrollTo({ top: clamped * AGE_ITEM_H, behavior: 'smooth' });
        applyAutoGrade();
    }

    let scrollTimeout;
    roller.addEventListener('scroll', () => {
        userChangedGrade = false;
        if (ageValue) ageValue.textContent = currentAge();
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(snapAge, 90);
    });

    gradeSelect.addEventListener('change', () => {
        userChangedGrade = true;
    });

    const flags = { LK: '🇱🇰', IN: '🇮🇳', SE: '🇸🇪' };
    if (countrySelect && flagBox) {
        countrySelect.addEventListener('change', () => {
            flagBox.textContent = flags[countrySelect.value] || '🏳️';
            userChangedGrade = false;
            applyAutoGrade();
        });
    }

    const start = ageList.indexOf(14);
    roller.scrollTop = (start >= 0 ? start : 0) * AGE_ITEM_H;
    applyAutoGrade();
}

/* ========== SCREENS ========== */

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
        screens.forEach(s => { s.style.display = "none"; s.classList.remove('active'); });
        if (targetScreen) {
            targetScreen.style.display = "flex";
            targetScreen.classList.add('active');
        }
    }
    if (!isBack) history.pushState({ screen: screenId }, "", "");
}

/* ========== AUTH + PROFILE ========== */

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

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        feedback.innerText = error.message;
        feedback.style.color = "red";
    } else {
        feedback.innerText = "Account created! You can login now.";
        feedback.style.color = "green";
        setTimeout(() => showScreen('login-screen'), 1500);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const feedback = document.getElementById('login-feedback');

    const { data: loginData, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        feedback.innerText = error.message;
        feedback.style.color = "red";
        return;
    }

    const user = loginData.user;
    let profile = null;

    if (user) {
        const { data } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        profile = data;

        if (!profile) {
            const { data: byEmail } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            profile = byEmail;
        }
    }

    const display = (profile && (profile.username || profile.name)) || null;

    if (display) {
        localStorage.setItem('mq_name', profile.name || display);
        if (profile.username) localStorage.setItem('mq_username', profile.username);
        updateProfileCircle(profile.username || profile.name);
        showScreen('menu-screen');
        showInstallPopupIfNeeded();
    } else {
        showScreen('name-screen');
        initProfileForm();
    }
}

async function saveUserName() {
    const name = (document.getElementById('userNameField') || {}).value;
    const username = (document.getElementById('usernameField') || {}).value;
    const school = (document.getElementById('schoolField') || {}).value;
    const gradeSelect = document.getElementById('gradeSelect');
    const countrySelect = document.getElementById('countrySelect');
    const ageValue = document.getElementById('ageValue');
    const feedback = document.getElementById('profile-feedback');

    const nameTrim = (name || '').trim();
    const usernameTrim = (username || '').trim();

    if (!nameTrim) {
        if (feedback) { feedback.innerText = "Please enter your name"; feedback.style.color = "red"; }
        else alert("Please enter your name");
        return;
    }
    if (!usernameTrim) {
        if (feedback) { feedback.innerText = "Please enter a username"; feedback.style.color = "red"; }
        else alert("Please enter a username");
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("You are not logged in");
        return;
    }

    const age = ageValue ? parseInt(ageValue.textContent, 10) : 14;
    const grade = gradeSelect ? parseInt(gradeSelect.value, 10) : null;
    const country = countrySelect ? countrySelect.value : 'LK';

    const row = {
        id: user.id,
        email: user.email,
        name: nameTrim,
        username: usernameTrim,
        age: age,
        grade: grade,
        country: country,
        school: (school || '').trim() || null,
        updated_at: new Date().toISOString()
    };

    // FIXED: no upsert / ON CONFLICT — insert or update manually
    const { data: existing, error: findError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    let error = findError;

    if (!error) {
        if (existing) {
            ({ error } = await supabaseClient
                .from('profiles')
                .update(row)
                .eq('id', user.id));
        } else {
            ({ error } = await supabaseClient
                .from('profiles')
                .insert(row));
        }
    }

    if (error) {
        if (feedback) {
            feedback.innerText = "Error: " + error.message;
            feedback.style.color = "red";
        } else {
            alert("Error saving profile: " + error.message);
        }
        return;
    }

    localStorage.setItem('mq_name', nameTrim);
    localStorage.setItem('mq_username', usernameTrim);
    updateProfileCircle(usernameTrim);
    showScreen('menu-screen');
    showInstallPopupIfNeeded();
}

function updateProfileCircle(text) {
    const circle = document.getElementById('profile-circle');
    if (circle && text) circle.innerText = text.charAt(0).toUpperCase();
}

async function openAccountScreen() {
    showScreen('account-screen');

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert('Please login first');
        showScreen('login-screen');
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val != null && val !== '' ? val : '—';
    };

    set('acc-email', user.email);
    if (profile) {
        set('acc-username', profile.username);
        set('acc-name', profile.name);
        set('acc-age', profile.age);
        set('acc-grade', profile.grade != null ? 'Grade ' + profile.grade : null);
        set('acc-country', profile.country);
        set('acc-school', profile.school);
        const letter = (profile.username || profile.name || '?').charAt(0).toUpperCase();
        const avatar = document.getElementById('account-avatar');
        if (avatar) avatar.textContent = letter;
        updateProfileCircle(profile.username || profile.name);
    } else {
        set('acc-username', localStorage.getItem('mq_username'));
        set('acc-name', localStorage.getItem('mq_name'));
    }
}

async function promptChangePassword() {
    const next = prompt('Enter your new password (min 6 characters):');
    if (!next) return;
    if (next.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    const { error } = await supabaseClient.auth.updateUser({ password: next });
    if (error) alert('Error: ' + error.message);
    else alert('Password updated successfully');
}

/* ========== HIGH SCORES ========== */

async function showHighScores() {
    const list = document.getElementById('highscores-list');
    list.innerHTML = "<p style='text-align:center; font-weight:700;'>Loading...</p>";
    showScreen('highscores-screen');

    const { data, error } = await supabaseClient
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);

    if (error) {
        list.innerHTML = "<p style='text-align:center; color:red;'>Error loading scores</p>";
        return;
    }
    if (!data || data.length === 0) {
        list.innerHTML = "<p style='text-align:center; font-weight:700;'>No scores yet.<br>Play quizzes to see high scores here.</p>";
        return;
    }

    let html = "";
    data.forEach((row, index) => {
        html += `<div style="background: var(--bg-cyan); border: 3px solid #000; border-radius: 12px; padding: 12px; margin-bottom: 10px; font-weight: 700;">
            <div style="font-size: 18px; color: var(--primary-blue);">${index + 1}. ${row.name || "Unknown"}</div>
            <div style="font-size: 14px; margin-top: 4px;">
                ${row.subject || ""} · ${row.grade || ""} · ${row.term || ""}<br>
                Score: <span style="color: green;">${row.score}%</span>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

async function saveScoreToSupabase(finalPercentage) {
    const { error } = await supabaseClient.from('scores').insert({
        name: localStorage.getItem('mq_name') || localStorage.getItem('mq_username') || "Unknown",
        grade: selectedGrade || "Unknown",
        subject: selectedSubj || "Unknown",
        term: currentTerm || "Unknown",
        score: finalPercentage,
        medium: "Sinhala Medium",
        exam_type: "School Term Test",
        paper_type: "Past Papers"
    });
    if (error) console.error("Error saving score:", error.message);
}

/* ========== QUIZ FLOW ========== */

function goHome() { showScreen('menu-screen'); }
function showGrades() { showScreen('grade-screen'); }

function selectGrade(grade) {
    selectedGrade = grade;
    if (document.getElementById('subject-screen')) showScreen('subject-screen');
    else if (document.getElementById('term-screen')) showScreen('term-screen');
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
    if (show) {
        const savedTime = localStorage.getItem('master_quiz_time');
        const savedLimit = localStorage.getItem('master_quiz_limit');
        if (savedTime) document.getElementById('diff-select').value = savedTime;
        if (savedLimit) document.getElementById('limit-select').value = savedLimit;

        overlay.style.display = 'flex';
        overlay.offsetHeight;
        const card = overlay.querySelector('.settings-card');
        if (card) card.scrollTop = 0;
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
        currentTerm = term;
        const savedTime = localStorage.getItem('master_quiz_time');
        const savedLimit = localStorage.getItem('master_quiz_limit');
        if (savedTime) difficultyTime = parseInt(savedTime);
        if (savedLimit) sessionLimit = parseInt(savedLimit);

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

function loadQuestion() {
    isAnswered = false;
    const submitBtn = document.getElementById('main-submit');
    if (submitBtn) submitBtn.style.visibility = "visible";

    const feedback = document.getElementById('feedback');
    if (feedback) { feedback.innerText = ""; feedback.style.color = ""; }

    const data = shuffled[current];
    if (!data) return;

    document.getElementById('q-idx').innerText = current + 1;
    document.getElementById('q-text').innerText = data.q;

    for (let i = 0; i < 4; i++) {
        const radio = document.getElementById(`o${i}`);
        const text = document.getElementById(`t${i}`);
        if (radio) { radio.checked = false; radio.disabled = false; }
        if (text) {
            text.innerText = data.options[i];
            text.classList.remove('correct-text', 'wrong-text');
            text.style.color = "#000";
        }
    }
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    const savedTime = localStorage.getItem('master_quiz_time');
    difficultyTime = savedTime ? parseInt(savedTime) : (difficultyTime || 5);
    timeLeft = difficultyTime;

    const box = document.getElementById('timer-box');
    if (box) box.innerText = `Time: ${timeLeft}s`;

    timer = setInterval(() => {
        timeLeft--;
        if (box) box.innerText = `Time: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            highlightCorrect();
            handleEnd("Time's Up!", false);
        }
    }, 1000);
}

function check() {
    if (isAnswered) return;

    let selected = -1;
    for (let i = 0; i < 4; i++) {
        if (document.getElementById(`o${i}`).checked) { selected = i; break; }
    }

    if (selected === -1) {
        const feedback = document.getElementById('feedback');
        if (feedback) {
            feedback.innerText = "Please select an answer";
            feedback.style.color = "green";
        }
        return;
    }

    clearInterval(timer);
    isAnswered = true;
    const correct = shuffled[current].correct;
    document.querySelectorAll('input[name="opt"]').forEach(r => r.disabled = true);

    if (selected === correct) {
        score++;
        document.getElementById(`t${selected}`).classList.add('correct-text');
        document.getElementById(`t${selected}`).style.color = "green";
        handleEnd("Correct! ✅", true);
    } else {
        document.getElementById(`t${selected}`).classList.add('wrong-text');
        document.getElementById(`t${selected}`).style.color = "red";
        highlightCorrect();
        handleEnd("Wrong! ❌", false);
    }
}

function highlightCorrect() {
    const correct = shuffled[current].correct;
    const text = document.getElementById(`t${correct}`);
    if (text) {
        text.classList.add('correct-text');
        text.style.color = "green";
    }
}

function handleEnd(msg, isCorrect) {
    isAnswered = true;
    const submitBtn = document.getElementById('main-submit');
    if (submitBtn) submitBtn.style.visibility = "hidden";

    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerText = msg;
        feedback.style.color = isCorrect ? "green" : "red";
    }

    const liveScore = document.getElementById('live-score');
    if (liveScore) liveScore.innerText = Math.round((score / (current + 1)) * 100) + "%";

    setTimeout(() => {
        current++;
        if (current < shuffled.length) {
            loadQuestion();
        } else {
            isQuizActive = false;
            const finalPercentage = Math.round((score / shuffled.length) * 100);
            saveScoreToSupabase(finalPercentage);
            showScreen('result-screen');
            const scoreDisplay = document.getElementById('final-score') || document.getElementById('final-score-val');
            if (scoreDisplay) scoreDisplay.innerText = finalPercentage + "%";
        }
    }, 1600);
}

function handleBackRequest() {
    if (confirm("Exit Quiz?")) {
        isQuizActive = false;
        clearInterval(timer);
        if (document.getElementById('subject-screen')) showScreen('subject-screen');
        else showScreen('menu-screen');
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
    document.getElementById('json-output').value = JSON.stringify({ q, options, correct: ans }) + ",";
}

/* ========== PWA + THEME ========== */

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPopupReady = true;
});

function showInstallPopupIfNeeded() {
    if (!installPopupReady || !deferredPrompt) return;
    const laterTime = localStorage.getItem("install_later");
    if (laterTime && Date.now() - parseInt(laterTime) < 3 * 24 * 60 * 60 * 1000) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const popup = document.getElementById("install-popup");
    if (popup) popup.style.display = "flex";
}

function hideInstallPopup() {
    const popup = document.getElementById("install-popup");
    if (popup) popup.style.display = "none";
}

document.addEventListener("click", async (e) => {
    if (e.target.id === "install-btn") {
        hideInstallPopup();
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log("Install outcome:", outcome);
            deferredPrompt = null;
        }
    }
    if (e.target.id === "later-btn" || e.target.id === "install-close") {
        hideInstallPopup();
        if (e.target.id === "later-btn") localStorage.setItem("install_later", Date.now().toString());
    }
    if (e.target.classList.contains("theme-btn")) {
        applyTheme(e.target.dataset.theme);
    }
});

window.addEventListener("appinstalled", () => {
    hideInstallPopup();
    deferredPrompt = null;
});

function applyTheme(themeName) {
    document.body.setAttribute("data-theme", themeName);
    localStorage.setItem("mq_theme", themeName);
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === themeName);
    });
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/termtestapp/sw.js")
        .then(() => console.log("Service Worker registered"))
        .catch((err) => console.log("SW error:", err));
}

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
window.showInstallPopupIfNeeded = showInstallPopupIfNeeded;
window.applyTheme = applyTheme;
window.openAccountScreen = openAccountScreen;
window.promptChangePassword = promptChangePassword;