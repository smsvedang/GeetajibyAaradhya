let players = {};
let completedShlokas = new Set();
let currentCourse = null;

/* ===== LOAD COURSES ===== */
async function loadCourses() {
    const res = await fetch('/api/courses');
    const courses = await res.json();

    const list = document.getElementById('course-list');
    list.innerHTML = '';

    courses.forEach(c => {
        const div = document.createElement('div');
        div.className = 'course-card';
        div.innerHTML = `
            <h3>${c.title}</h3>
            <p>${c.description || ''}</p>
            <button class="start-course-btn" onclick="openCourse('${c._id}')">
                Start Course
            </button>
        `;
        list.appendChild(div);
    });
}

/* ===== OPEN SINGLE COURSE ===== */
async function openCourse(id) {
    document.getElementById('course-list').style.display = 'none';
    document.getElementById('single-course').style.display = 'block';

    const res = await fetch(`/api/courses/${id}`);
    currentCourse = await res.json();

    completedShlokas.clear();

    document.getElementById('course-title').textContent = currentCourse.title;
    document.getElementById('course-description').textContent =
        currentCourse.description || '';

    const box = document.getElementById('course-shlokas');
    box.innerHTML = '';

    currentCourse.shlokas.forEach(s => {
        const div = document.createElement('div');
        div.className = 'shloka-item-card';
        div.innerHTML = `
            <div class="card-video-container">
                <div id="player-${s._id}"></div>
            </div>
            <div class="card-content">
                <h3>Adhyay ${s.adhyay} – Shloka ${s.shloka}</h3>
                <p class="shloka-text">${s.text || ''}</p>
                <p id="status-${s._id}">⏳ Not Completed</p>
            </div>
        `;
        box.appendChild(div);
    });

    setTimeout(initPlayers, 500);
}

/* ===== YOUTUBE PLAYERS ===== */
function initPlayers() {
    currentCourse.shlokas.forEach(s => {
        players[s._id] = new YT.Player(`player-${s._id}`, {
            videoId: s.video_id,
            events: {
                onStateChange: e => onVideoStateChange(e, s._id)
            }
        });
    });
}

function onVideoStateChange(event, shlokaId) {
    if (event.data === YT.PlayerState.ENDED) {
        completedShlokas.add(shlokaId);
        document.getElementById(`status-${shlokaId}`).textContent =
            '✅ Completed';

        checkCompletion();
    }
}

/* ===== CHECK COURSE COMPLETION ===== */
function checkCompletion() {
    if (completedShlokas.size === currentCourse.shlokas.length) {
        document.getElementById('completion-box').style.display = 'block';
    }
}

/* ===== CERTIFICATE ===== */
async function generateCertificate() {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const mobile = document.getElementById('user-mobile').value;
    const lang = document.getElementById('cert-lang').value;

    if (!name || !email || !mobile) {
        alert('Please fill all details');
        return;
    }

    const res = await fetch('/api/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            courseTitle: currentCourse.title,
            lang
        })
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url);
}

/* ===== BACK ===== */
function goBack() {
    document.getElementById('single-course').style.display = 'none';
    document.getElementById('course-list').style.display = 'block';
    document.getElementById('completion-box').style.display = 'none';
}

/* INIT */
loadCourses();
