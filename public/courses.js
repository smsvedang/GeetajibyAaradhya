/***********************
 * GLOBAL STATE
 ***********************/
let players = {};
let completedShlokas = new Set();
let currentCourse = null;
let quizPassed = false;
let userMobile = localStorage.getItem('userMobile') || '';
const params = new URLSearchParams(window.location.search);
const autoCourseId = params.get('courseId');
const quizStatus = params.get('quiz');

/***********************
 * LOAD COURSES LIST
 ***********************/
async function loadCourses() {
    const res = await fetch('/api/courses');
    const courses = await res.json();

    const list = document.getElementById('course-list');
    list.innerHTML = '';

    courses.forEach(course => {
        list.innerHTML += `
            <div class="course-card">
                <h3>${course.title}</h3>
                <p>${course.description || ''}</p>
                <button onclick="openCourse('${course._id}')">
                    Start Course
                </button>
            </div>
        `;
    });
}

if (autoCourseId) {
    openCourse(autoCourseId);

    if (quizStatus === 'passed') {
        setTimeout(() => {
            document.getElementById('certificate-box').scrollIntoView({
                behavior: 'smooth'
            });
        }, 800);
    }
}

/***********************
 * OPEN COURSE
 ***********************/
async function openCourse(courseId) {
    document.getElementById('course-list').style.display = 'none';
    document.getElementById('single-course').style.display = 'block';

    const res = await fetch(`/api/courses/${courseId}`);
    currentCourse = await res.json();

    completedShlokas.clear();
    quizPassed = false;

    document.getElementById('course-title').textContent = currentCourse.title;
    document.getElementById('header-title').textContent = currentCourse.title;

    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('certificate-box').style.display = 'none';

    const shlokaBox = document.getElementById('course-shlokas');
    shlokaBox.innerHTML = '';

    currentCourse.shlokas.forEach(shloka => {
        shlokaBox.innerHTML += `
            <div class="shloka-item-card">
                <div class="video-wrapper">
                    <div id="player-${shloka._id}"></div>
                </div>
                <div class="card-content">
                    <p>${shloka.text || ''}</p>
                    <p id="status-${shloka._id}">⏳ Not completed</p>
                </div>
            </div>
        `;
    });

    setTimeout(() => {
        initPlayers();
        setTimeout(restoreProgress, 300);
    }, 400);
}

/***********************
 * YOUTUBE PLAYERS
 ***********************/
function initPlayers() {
    if (!window.YT || !YT.Player || !currentCourse) return;

    currentCourse.shlokas.forEach(shloka => {
        players[shloka._id] = new YT.Player(`player-${shloka._id}`, {
            videoId: shloka.video_id,
            width: '100%',
            height: '100%',
            playerVars: { rel: 0, modestbranding: 1 },
            events: {
                onStateChange: e => {
                    if (e.data === YT.PlayerState.ENDED) {
                        completedShlokas.add(shloka._id);

                        const el = document.getElementById(`status-${shloka._id}`);
                        if (el) el.textContent = '✅ Completed';

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
        userMobile = prompt('Enter your mobile number');
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
    if (!currentCourse || !currentCourse._id || !userMobile) return;

    const res = await fetch(
        `/api/progress/${userMobile}/${currentCourse._id}`
    );
    if (!res.ok) return;

    const data = await res.json();

    if (Array.isArray(data.completed)) {
        data.completed.forEach(id => {
            completedShlokas.add(id);
            const el = document.getElementById(`status-${id}`);
            if (el) el.textContent = '✅ Completed';
        });
    }

    checkQuizUnlock();

    // ✅ restore quiz pass status
   if (data.quizPassed) {
    quizPassed = true;

    document.getElementById('certificate-box').style.display = 'block';
    document.getElementById('certificate-box')
        .scrollIntoView({ behavior: 'smooth' });

    document.getElementById('quiz-btn').disabled = true;

    document.getElementById('certificate-box').innerHTML =
        `<h3>🎉 Congratulations! Course Completed</h3>`
       `<h3> You will receive your certificate on WhatsApp & Email within 24 hours.</h3>`;
}
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
 * Progress Bar Update
 ***********************/
function updateProgressBar() {
    const percent = Math.round(
        (completedShlokas.size / currentCourse.shlokas.length) * 100
    );
    document.getElementById('progress-bar').style.width = percent + '%';
}

/***********************
 * START QUIZ
 ***********************/
function startQuiz() {
    if (!currentCourse || !currentCourse._id) {
        alert('Course not loaded');
        return;
    }

    window.location.href = `/quiz.html?courseId=${currentCourse._id}`;
}

/***********************
 * CERTIFICATE download
 ***********************/
async function submitCertificateDetails() {
    if (!quizPassed) {
        alert('Please pass the quiz first');
        return;
    }

    const name = document.getElementById('user-name').value;
    const mobile = document.getElementById('user-mobile').value;
    const email = document.getElementById('user-email').value;
    const lang = document.getElementById('cert-lang').value;

    if (!name || !mobile) {
        alert('Please fill required details');
        return;
    }

    await fetch('/api/certificate/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            mobile,
            email,
            courseTitle: currentCourse.title,
            language: lang
        })
    });

    document.getElementById('certificate-box').innerHTML = `
        <p style="color:green;font-weight:bold">
            ✅ Your details have been submitted successfully.<br>
            You will receive your certificate on WhatsApp & Email within 24 hours.
        </p>
    `;
}

/***********************
 * NAVIGATION
 ***********************/
function goBack() {
    document.getElementById('single-course').style.display = 'none';
    document.getElementById('course-list').style.display = 'block';
}

function goHome() {
    window.location.href = '/';
}

/***********************
 * INIT
 ***********************/
loadCourses();
