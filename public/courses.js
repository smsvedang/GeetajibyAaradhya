/***********************
 * GLOBAL STATE
 ***********************/
let players = {};
let completedShlokas = new Set();
let currentCourse = null;
let quizPassed = false;
let userMobile = localStorage.getItem('userMobile') || '';

/***********************
 * LOAD COURSES LIST
 ***********************/
async function loadCourses() {
    const r = await fetch('/api/courses');
    const courses = await r.json();

    const list = document.getElementById('course-list');
    list.innerHTML = '';

    courses.forEach(c => {
        list.innerHTML += `
            <div class="course-card">
                <h3>${c.title}</h3>
                <p>${c.description || ''}</p>
                <button onclick="openCourse('${c._id}')">
                    Start Course
                </button>
            </div>
        `;
    });
}

/***********************
 * OPEN SINGLE COURSE
 ***********************/
async function openCourse(id) {
    document.getElementById('course-list').style.display = 'none';
    document.getElementById('single-course').style.display = 'block';

    const r = await fetch(`/api/courses/${id}`);
    currentCourse = await r.json();

    completedShlokas.clear();
    quizPassed = false;

    document.getElementById('course-title').textContent = currentCourse.title;
    document.getElementById('header-title').textContent = currentCourse.title;

    const box = document.getElementById('course-shlokas');
    box.innerHTML = '';

    currentCourse.shlokas.forEach(s => {
        box.innerHTML += `
            <div class="shloka-item-card">
                <div class="video-wrapper">
                    <div id="player-${s._id}"></div>
                </div>
                <div class="card-content">
                    <p>${s.text || ''}</p>
                    <p id="status-${s._id}">⏳ Not completed</p>
                </div>
            </div>
        `;
    });

    // ✅ STEP-1: players
    setTimeout(() => {
        initPlayers();

        // ✅ STEP-2: restore AFTER players
        setTimeout(() => {
            restoreProgress();
        }, 200);

    }, 300);
}

/***********************
 * YOUTUBE PLAYERS
 ***********************/
function initPlayers() {
    if (!window.YT || !YT.Player) return;

    currentCourse.shlokas.forEach(s => {
        players[s._id] = new YT.Player(`player-${s._id}`, {
            videoId: s.video_id,
            width: '100%',
            height: '100%',
            playerVars: {
                rel: 0,
                modestbranding: 1
            },
            events: {
                onStateChange: e => {
                    if (e.data === YT.PlayerState.ENDED) {
                        completedShlokas.add(s._id);

                        const st = document.getElementById(`status-${s._id}`);
                        if (st) st.textContent = '✅ Completed';

                        saveProgress();
                        checkQuizUnlock();
                    }
                }
            }
        });
    });
}

/***********************
 * SAVE PROGRESS
 ***********************/
async function saveProgress() {
    if (!currentCourse || !currentCourse._id) return;

    if (!userMobile) {
        userMobile = prompt('Enter mobile number');
        if (!userMobile) return;
        localStorage.setItem('userMobile', userMobile);
    }

    await fetch('/api/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mobile: userMobile,
            courseId: currentCourse._id,
            completed: [...completedShlokas]
        })
    });
}

/***********************
 * RESTORE PROGRESS
 ***********************/
async function restoreProgress() {
    if (!currentCourse || !currentCourse._id) return;

    if (!userMobile) {
        userMobile = localStorage.getItem('userMobile');
        if (!userMobile) return;
    }

    const res = await fetch(
        `/api/progress/${userMobile}/${currentCourse._id}`
    );
    if (!res.ok) return;

    const data = await res.json();
    if (!data || !data.completed) return;

    data.completed.forEach(id => {
        completedShlokas.add(id);

        const el = document.getElementById(`status-${id}`);
        if (el && !el.textContent.includes('Completed')) {
            el.textContent = '✅ Completed';
        }
    });

    checkQuizUnlock();
}
if (data.quizPassed) {
    quizPassed = true;
    document.getElementById('certificate-box').style.display = 'block';
}

/***********************
 * QUIZ UNLOCK
 ***********************/
function checkQuizUnlock() {
    if (
        currentCourse &&
        completedShlokas.size === currentCourse.shlokas.length
    ) {
        document.getElementById('quiz-box').style.display = 'block';
    }
}

/***********************
 * CERTIFICATE
 ***********************/
function generateCertificate() {
    if (!quizPassed) {
        alert('Please pass the quiz first');
        return;
    }

    const name = document.getElementById('user-name').value;
    const lang = document.getElementById('cert-lang').value;

    if (!name) {
        alert('Please enter your name');
        return;
    }

    const url =
        `/api/certificate` +
        `?mobile=${userMobile}` +
        `&courseId=${currentCourse._id}` +
        `&name=${encodeURIComponent(name)}` +
        `&courseTitle=${encodeURIComponent(currentCourse.title)}` +
        `&lang=${lang}`;

    window.open(url, '_blank');
}

/***********************
 * NAVIGATION
 ***********************/
function goBack() {
    document.getElementById('single-course').style.display = 'none';
    document.getElementById('course-list').style.display = 'block';
}

function goHome() {
    location.href = '/';
}

/***********************
 * INIT
 ***********************/
loadCourses();
