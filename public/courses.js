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
<div class="course-card" onclick="openCourse('${course._id}')">
    <div class="course-card-image" style="background-image: url('${course.imageUrl || 'default-course.jpg'}')"></div>
    <div class="course-card-content">
        <h3>${course.title}</h3>
        <p>${course.description || ''}</p>
        <button class="primary-btn">Start Course</button>
    </div>
</div>
`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadCourses();

    if (autoCourseId) {
        openCourse(autoCourseId);

        if (quizStatus === 'passed') {
            setTimeout(() => {
                const certBox = document.getElementById('certificate-box');
                if (certBox) certBox.scrollIntoView({ behavior: 'smooth' });
            }, 800);
        }
    }
});

/***********************
 * OPEN COURSE
 ***********************/
async function openCourse(courseId) {
    const courseListEl = document.getElementById('course-list');
    if (courseListEl) courseListEl.style.display = 'none';

    const singleCourseEl = document.getElementById('single-course');
    if (singleCourseEl) singleCourseEl.style.display = 'block';

    const res = await fetch(`/api/courses/${courseId}`);
    currentCourse = await res.json();

    completedShlokas.clear();
    quizPassed = false;

    const courseTitleEl = document.getElementById('course-title');
    if (courseTitleEl) courseTitleEl.textContent = currentCourse.title;

    const headerTitleEl = document.getElementById('header-title');
    if (headerTitleEl) headerTitleEl.textContent = currentCourse.title;

    const quizBoxEl = document.getElementById('quiz-box');
    if (quizBoxEl) quizBoxEl.style.display = 'none';

    const certificateBoxEl = document.getElementById('certificate-box');
    if (certificateBoxEl) certificateBoxEl.style.display = 'none';

    const shlokaBox = document.getElementById('course-shlokas');
    if (shlokaBox) {
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
    }

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

    const certBox = document.getElementById('certificate-box');
    certBox.style.display = 'block';

    // quiz dobara start na ho
    const quizBtn = document.getElementById('quiz-btn');
    if (quizBtn) quizBtn.disabled = true;

    // ⚠️ IMPORTANT: form ko overwrite NA karein
    certBox.scrollIntoView({ behavior: 'smooth' });
    const courseKey = `cert_submitted_${currentCourse._id}`;
if (localStorage.getItem(courseKey)) {
    document.getElementById('certificate-box').innerHTML = `
        <p style="color:green;font-weight:bold">
            ✅ Your certificate request has already been submitted.<br>
            You will receive it on WhatsApp & Email within 24 hours.
        </p>
    `;
}
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

    const courseKey = `cert_submitted_${currentCourse._id}`;

    // ⛔ already submitted
    if (localStorage.getItem(courseKey)) {
        document.getElementById('certificate-box').innerHTML = `
            <p style="color:green;font-weight:bold">
                ✅ Your certificate request has already been submitted.<br>
                You will receive it on WhatsApp & Email within 24 hours.
            </p>
        `;
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

    const res = await fetch('/api/certificate/request', {
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

    if (res.status === 409) {
        localStorage.setItem(courseKey, 'true');
        document.getElementById('certificate-box').innerHTML = `
            <p style="color:green;font-weight:bold">
                ✅ Your certificate request was already submitted.<br>
                You will receive it on WhatsApp & Email within 24 hours.
            </p>
        `;
        return;
    }

    if (!res.ok) {
        alert('Something went wrong. Please try later.');
        return;
    }

    // ✅ success
    localStorage.setItem(courseKey, 'true');

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
