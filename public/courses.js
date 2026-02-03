/***********************
 * GLOBAL STATE
 ***********************/
let players = {};
let completedShlokas = new Set();
let currentCourse = null;
let quizPassed = false;

// Get user from Gitadhya login
const gitadhyaUser = JSON.parse(localStorage.getItem('gitadhya_user'));
const userMobile = gitadhyaUser ? gitadhyaUser.mobile : '';

const params = new URLSearchParams(window.location.search);
const autoCourseId = params.get('courseId');

/***********************
 * LOAD COURSES LIST
 ***********************/
async function loadCourses() {
    const res = await fetch('/api/courses');
    const courses = await res.json();

    const list = document.getElementById('course-list');
    if (!list) return;
    list.innerHTML = '';

    courses.forEach(course => {
        list.innerHTML += `
<div class="course-card-premium" onclick="openCourse('${course._id}')">
    <div class="course-image-box" style="background-image: url('${course.imageUrl || '/favicon.png'}')"></div>
    <div class="course-info">
        <h3>${course.title}</h3>
        <p>${course.description || 'A spiritual odyssey through the verses of the Geeta.'}</p>
        <div style="font-weight:700; color:var(--primary); margin-top:auto;">Explore Curriculum <i class="fas fa-arrow-right"></i></div>
    </div>
</div>
`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadCourses();

    if (autoCourseId) {
        setTimeout(() => openCourse(autoCourseId), 500);
    }
});

/***********************
 * OPEN COURSE
 ***********************/
async function openCourse(courseId) {
    if (!userMobile) {
        alert('Please login to Gitadhya to start this course.');
        window.location.href = 'index.html?auth=true';
        return;
    }

    localStorage.setItem('active_course', courseId);

    // UI SWITCH
    const listSection = document.getElementById('course-list-view');
    const detailSection = document.getElementById('single-course-view');
    const backBtn = document.getElementById('back-btn');

    if (listSection) listSection.style.display = 'none';
    if (detailSection) detailSection.style.display = 'block';
    if (backBtn) backBtn.style.display = 'block';

    window.scrollTo(0, 0);

    const res = await fetch(`/api/courses/${courseId}`);
    currentCourse = await res.json();

    completedShlokas.clear();
    quizPassed = false;

    // UPDATE UI WITH COURSE DATA
    document.getElementById('view-course-title').textContent = currentCourse.title;
    document.getElementById('view-course-desc').textContent = currentCourse.description || 'Embark on a spiritual journey of the soul.';
    document.getElementById('view-course-img').src = currentCourse.imageUrl || '/favicon.png';

    const shlokaBox = document.getElementById('course-shlokas');
    if (shlokaBox) {
        shlokaBox.innerHTML = '';
        currentCourse.shlokas.forEach((shloka, idx) => {
            shlokaBox.innerHTML += `
                <div class="shloka-item-card">
                    <div class="card-video-container">
                        <div id="player-${shloka._id}"></div>
                    </div>
                    <div class="card-content">
                        <span style="color:var(--primary); font-weight:800; font-size:0.8rem; text-transform:uppercase;">Lesson ${idx + 1}</span>
                        <h3 style="margin:5px 0 10px;">Adhyay ${shloka.adhyay}, Shloka ${shloka.shloka}</h3>
                        <p id="status-${shloka._id}" class="status-badge status-pending">⏳ Not completed</p>
                    </div>
                </div>
            `;
        });
    }

    setTimeout(() => {
        initPlayers();
        setTimeout(restoreProgress, 600);
    }, 500);
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
                        if (el) {
                            el.textContent = '✅ Completed';
                            el.className = 'status-badge status-done';
                        }
                        saveProgress();
                        checkQuizUnlock();
                    }
                }
            }
        });
    });
}

/***********************
 * SAVE & RESTORE
 ***********************/
async function saveProgress() {
    if (!currentCourse || !userMobile) return;
    await fetch('/api/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: userMobile, courseId: currentCourse._id, completed: [...completedShlokas] })
    });
    updateProgressBar();
}

async function restoreProgress() {
    if (!currentCourse || !userMobile) return;
    try {
        const res = await fetch(`/api/progress/${userMobile}/${currentCourse._id}`);
        if (!res.ok) return;
        const data = await res.json();

        if (Array.isArray(data.completed)) {
            data.completed.forEach(id => {
                completedShlokas.add(id);
                const el = document.getElementById(`status-${id}`);
                if (el) {
                    el.textContent = '✅ Completed';
                    el.className = 'status-badge status-done';
                }
            });
        }
        updateProgressBar();
        checkQuizUnlock();

        if (data.quizPassed) {
            quizPassed = true;
            showCertificateForm();
        }
    } catch (e) { console.error("Restore error", e); }
}

function updateProgressBar() {
    if (!currentCourse) return;
    const percent = Math.round((completedShlokas.size / currentCourse.shlokas.length) * 100);
    const badge = document.getElementById('progress-stats');
    if (badge) badge.innerHTML = `<i class="fas fa-tasks"></i> ${percent}% Complete`;
}

function checkQuizUnlock() {
    if (currentCourse && completedShlokas.size === currentCourse.shlokas.length) {
        document.getElementById('quiz-box').style.display = 'block';
    }
}

/***********************
 * QUIZ & CERT
 ***********************/
function startQuiz() {
    window.location.href = `/quiz.html?courseId=${currentCourse._id}`;
}

function showCertificateForm() {
    const box = document.getElementById('certificate-box');
    if (!box) return;
    box.style.display = 'block';
    const courseKey = `cert_submitted_${currentCourse._id}`;

    if (localStorage.getItem(courseKey)) {
        box.innerHTML = `<p style="color:green;font-weight:bold;text-align:center;">
            ✅ Your request is submitted. Admin approval pending.
        </p>`;
    } else {
        box.innerHTML = `
            <h3>🎓 Claim Your Certificate</h3>
            <p>You have successfully completed the course. Please provide your printing details.</p>
            <input id="cert-name" placeholder="Full Name for Certificate" value="${gitadhyaUser.name}" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
            <input id="cert-mobile" placeholder="Mobile Number" value="${gitadhyaUser.mobile}" readonly style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #ddd; background:#f5f5f5;">
            <button class="watch-btn" onclick="requestCertificate()" style="border:none; cursor:pointer; width:100%;">Request Certificate</button>
        `;
    }
}

async function requestCertificate() {
    const name = document.getElementById('cert-name').value;
    const mobile = document.getElementById('cert-mobile').value;
    if (!name || !mobile) return alert('Name is required');

    const res = await fetch('/api/certificate/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile, courseTitle: currentCourse.title, language: 'hi' })
    });
    if (res.ok) {
        localStorage.setItem(`cert_submitted_${currentCourse._id}`, 'true');
        showCertificateForm();
    } else alert('Request failed or already exists');
}

/***********************
 * NAVIGATION
 ***********************/
function goBack() {
    document.getElementById('course-list-view').style.display = 'block';
    document.getElementById('single-course-view').style.display = 'none';
    document.getElementById('back-btn').style.display = 'none';
    window.scrollTo(0, 0);
}
