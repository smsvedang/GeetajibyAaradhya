let players = {};
let completedShlokas = new Set();
let currentCourse = null;
let quizPassed = false;

/* LOAD COURSES */
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
                <button class="start-course-btn" onclick="openCourse('${c._id}')">
                    Start Course
                </button>
            </div>`;
    });
}

/* OPEN COURSE */
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
                <div id="player-${s._id}"></div>
                <div class="card-content">
                    <p>${s.text || ''}</p>
                    <p id="status-${s._id}">⏳ Not completed</p>
                </div>
            </div>`;
    });

    setTimeout(initPlayers, 500);
}

/* YOUTUBE */
function initPlayers() {
    currentCourse.shlokas.forEach(s => {
        players[s._id] = new YT.Player(`player-${s._id}`, {
            videoId: s.video_id,
            events: {
                onStateChange: e => {
                    if (e.data === YT.PlayerState.ENDED) {
                        completedShlokas.add(s._id);
                        document.getElementById(`status-${s._id}`).textContent = '✅ Completed';
                        checkQuizUnlock();
                    }
                }
            }
        });
    });
}

/* QUIZ UNLOCK */
function checkQuizUnlock() {
    if (completedShlokas.size === currentCourse.shlokas.length) {
        document.getElementById('quiz-box').style.display = 'block';
    }
}

/* SIMULATED QUIZ */
const url = new URLSearchParams(location.search);
if (url.get('quiz') === 'passed') {
    document.getElementById('certificate-box').style.display = 'block';
}


/* CERTIFICATE */
async function generateCertificate() {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const mobile = document.getElementById('user-mobile').value;
    const lang = document.getElementById('cert-lang').value;

    if (!quizPassed) {
        alert('Complete quiz first');
        return;
    }

    const r = await fetch('/api/certificate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            name,
            courseTitle: currentCourse.title,
            lang
        })
    });

    const blob = await r.blob();
    window.open(URL.createObjectURL(blob));
}

/* NAV */
function goBack() {
    document.getElementById('single-course').style.display = 'none';
    document.getElementById('course-list').style.display = 'block';
}

function goHome() {
    location.href = '/';
}

loadCourses();
