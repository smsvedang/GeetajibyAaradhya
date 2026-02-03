/***********************
 * GLOBAL STATE
 ***********************/
let players = {};
let completedShlokas = new Set();
let currentCourse = null;
let quizPassed = false;

const DEFAULT_ADHYAY_TOTALS = {
    1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47,
    7: 30, 8: 28, 9: 34, 10: 42, 11: 55, 12: 20,
    13: 35, 14: 27, 15: 20, 16: 24, 17: 28, 18: 78
};

let siteSettings = null;

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
        const running = isCourseRunningForCourse(course);
        const statusBadge = running
            ? `<div class="course-status-badge running">Ongoing</div>`
            : `<div class="course-status-badge completed">Full Syllabus</div>`;
        const desc = (course.description || 'A spiritual odyssey through the verses of the Geeta.').replace(/\s+/g, ' ').trim();
        const shortDesc = desc.length > 140 ? desc.slice(0, 140).trim() + '...' : desc;
        list.innerHTML += `
<div class="course-card-premium" onclick="openCourse('${course._id}')">
    <div class="course-image-box" style="background-image: url('${course.imageUrl || '/favicon.png'}')"></div>
    <div class="course-info">
        ${statusBadge}
        <h3>${course.title}</h3>
        <p>${shortDesc}</p>
        <div style="font-weight:700; color:var(--primary); margin-top:auto;">Explore Curriculum <i class="fas fa-arrow-right"></i></div>
    </div>
</div>
`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings().finally(() => {
        loadCourses();
    });

    if (autoCourseId) {
        setTimeout(() => openCourse(autoCourseId), 500);
    }
});

document.addEventListener('click', async (e) => {
    const shareButton = e.target.closest('.share-button');
    if (shareButton) {
        const urlToShare = shareButton.dataset.url;
        const title = shareButton.dataset.title;
        const text = shareButton.dataset.text;
        if (navigator.share) {
            try { await navigator.share({ title: title, text: text, url: urlToShare }); }
            catch (err) { console.error('Share failed:', err); }
        } else {
            try { await navigator.clipboard.writeText(urlToShare); alert('Link copied to clipboard!'); }
            catch (err) { alert('Failed to copy link.'); }
        }
    }

    const likeButton = e.target.closest('.like-button');
    if (likeButton) {
        const shlokaDbId = likeButton.dataset.id;
        if (localStorage.getItem('liked_' + shlokaDbId)) { return; }
        likeButton.disabled = true;
        try {
            const response = await fetch(`/api/shloka/like/${shlokaDbId}`, { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                const countSpan = likeButton.querySelector('.like-count');
                countSpan.textContent = data.likes;
                localStorage.setItem('liked_' + shlokaDbId, 'true');
            } else { likeButton.disabled = false; }
        } catch (err) { likeButton.disabled = false; }
    }
});

/***********************
 * OPEN COURSE
 ***********************/
async function openCourse(courseId) {
    await loadSiteSettings();

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
    if (document.getElementById('quiz-box')) document.getElementById('quiz-box').style.display = 'none';
    if (document.getElementById('certificate-box')) document.getElementById('certificate-box').style.display = 'none';

    // UPDATE UI WITH COURSE DATA
    document.getElementById('view-course-title').textContent = currentCourse.title;
    document.getElementById('view-course-desc').textContent = currentCourse.description || 'Embark on a spiritual journey of the soul.';
    document.getElementById('view-course-img').src = currentCourse.imageUrl || '/favicon.png';

    const shlokaBox = document.getElementById('course-shlokas');
    if (shlokaBox) {
        shlokaBox.innerHTML = '';
        currentCourse.shlokas.forEach((shloka, idx) => {
            const isLiked = localStorage.getItem('liked_' + shloka._id) === 'true';
            const shareTitle = `Aaradhya Soni - Gita Adhyay ${shloka.adhyay}, Shloka ${shloka.shloka}`;
            const shareText = `Listen to Aaradhya's recitation of Gita Adhyay ${shloka.adhyay}, Shloka ${shloka.shloka}`;
            const shareUrl = `${window.location.origin}/shloka.html?id=${shloka._id}`;
            shlokaBox.innerHTML += `
                <div class="shloka-item-card">
                    <div class="card-video-container">
                        <div id="player-${shloka._id}"></div>
                    </div>
                    <div class="card-content">
                        <span style="color:var(--primary); font-weight:800; font-size:0.8rem; text-transform:uppercase;">Lesson ${idx + 1}</span>
                        <h3 style="margin:5px 0 10px;">Adhyay ${shloka.adhyay}, Shloka ${shloka.shloka}</h3>
                        <p id="status-${shloka._id}" class="status-badge status-pending">⏳ Not completed</p>
                        <div class="shloka-actions">
                            <button class="shloka-action-button like-button" data-id="${shloka._id}" ${isLiked ? 'disabled' : ''}>
                                ❤️ <span class="like-count">${shloka.likes || 0}</span>
                            </button>
                            <button class="shloka-action-button share-button"
                                data-url="${shareUrl}"
                                data-title="${shareTitle}"
                                data-text="${shareText}">
                                🔗 Share
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    setTimeout(() => {
        initPlayers();
        setTimeout(restoreProgress, 600);
    }, 500);

    updateProgressBar();
    checkQuizUnlock();
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
    const badge = document.getElementById('progress-stats');
    if (!badge) return;

    const expectedTotal = getExpectedTotalShlokas();
    const available = currentCourse.shlokas.length;
    const base = expectedTotal || available || 1;
    const percent = Math.round((completedShlokas.size / base) * 100);

    if (isCourseRunning()) {
        badge.innerHTML = `<i class="fas fa-spinner"></i> Currently Running • ${available}/${expectedTotal} Shlokas Available`;
        badge.style.background = 'rgba(245,158,11,0.08)';
        badge.style.borderColor = '#f59e0b';
        badge.style.color = '#b45309';
    } else {
        badge.innerHTML = `<i class="fas fa-tasks"></i> ${percent}% Complete`;
        badge.style.background = 'rgba(216,67,21,0.05)';
        badge.style.borderColor = 'var(--primary)';
        badge.style.color = 'var(--primary)';
    }
}

function checkQuizUnlock() {
    if (!currentCourse) return;
    const quizBox = document.getElementById('quiz-box');
    if (!quizBox) return;

    if (isCourseRunning()) {
        quizBox.style.display = 'none';
        return;
    }

    if (completedShlokas.size === currentCourse.shlokas.length) {
        quizBox.style.display = 'block';
    } else {
        quizBox.style.display = 'none';
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

function getExpectedTotalShlokas() {
    if (!currentCourse) return 0;
    const adhyay = parseInt(currentCourse.adhyay, 10);
    const customTotals = siteSettings && siteSettings.adhyayTotals ? siteSettings.adhyayTotals : {};
    const customTotal = customTotals && customTotals[adhyay];
    return customTotal || DEFAULT_ADHYAY_TOTALS[adhyay] || currentCourse.shlokas.length || 0;
}

function isCourseRunning() {
    if (!currentCourse) return false;
    const statusOverrides = siteSettings && siteSettings.courseStatusOverrides ? siteSettings.courseStatusOverrides : {};
    const override = statusOverrides ? statusOverrides[currentCourse._id] : null;
    if (override === 'running') return true;
    if (override === 'completed') return false;
    const expectedTotal = getExpectedTotalShlokas();
    if (!expectedTotal) return false;
    return currentCourse.shlokas.length < expectedTotal;
}

function getExpectedTotalForCourse(course) {
    const adhyay = parseInt(course.adhyay, 10);
    const customTotals = siteSettings && siteSettings.adhyayTotals ? siteSettings.adhyayTotals : {};
    const customTotal = customTotals && customTotals[adhyay];
    return customTotal || DEFAULT_ADHYAY_TOTALS[adhyay] || (course.shlokas ? course.shlokas.length : 0) || 0;
}

function isCourseRunningForCourse(course) {
    const statusOverrides = siteSettings && siteSettings.courseStatusOverrides ? siteSettings.courseStatusOverrides : {};
    const override = statusOverrides ? statusOverrides[course._id] : null;
    if (override === 'running') return true;
    if (override === 'completed') return false;
    const expectedTotal = getExpectedTotalForCourse(course);
    if (!expectedTotal) return false;
    const available = course.shlokas ? course.shlokas.length : 0;
    return available < expectedTotal;
}

async function loadSiteSettings() {
    if (siteSettings) return siteSettings;
    try {
        const r = await fetch('/api/settings');
        siteSettings = await r.json();
    } catch (e) {
        siteSettings = {};
    }
    return siteSettings;
}
