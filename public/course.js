const params = new URLSearchParams(location.search);
const courseId = params.get('id');

function t(key, fallback) {
  const dict = window.__I18N__ || {};
  return dict[key] || fallback;
}

async function saveProgress(shlokaId) {
  const mobile = localStorage.getItem('user_mobile');
  if (!mobile || !courseId) return;

  await fetch('/api/progress/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobile,
      courseId,
      completed: [shlokaId]
    })
  });
}

async function loadCourse() {
    if (!courseId) return;

    const titleEl = document.getElementById('course-title');
    const container = document.getElementById('course-container');
    if (container) container.innerHTML = '';

    try {
        const res = await fetch(`/api/courses/${courseId}`);
        const course = await res.json();

        titleEl.textContent = course.title;

        if (!course.shlokas || course.shlokas.length === 0) {
            container.innerHTML = `<p>${t('course_no_shlokas', 'No shlokas in this course.')}</p>`;
            return;
        }

        const mobile = localStorage.getItem('user_mobile');
let completed = [];

if (mobile) {
  const p = await fetch(`/api/progress/${mobile}/${courseId}`).then(r => r.json());
  completed = p.completed || [];
}

        course.shlokas.forEach((s, index) => {
            const div = document.createElement('div');
            div.className = 'shloka-card';

            div.innerHTML = `
                <h3>Shloka ${index + 1}</h3>
                <p>${s.text || ''}</p>

                <div id="player-${s._id}"></div>

                <button class="complete-btn"
  ${completed.includes(s._id) ? 'disabled' : ''}
  onclick="saveProgress('${s._id}')">
  ${completed.includes(s._id) ? t('course_completed', 'Completed ✅') : t('course_mark_complete', 'Mark as Completed')}
</button>
            `;

            container.appendChild(div);
            new YT.Player(`player-${s._id}`, {
  videoId: s.video_id,
  playerVars: {
    enablejsapi: 1,
    origin: 'https://www.warrioraaradhya.in'
  }
});
        });

    } catch (err) {
        console.error(err);
        container.innerHTML =
            `<p style="color:red;">${t('course_failed', 'Failed to load course.')}</p>`;
    }
}

loadCourse();

window.addEventListener('i18n:changed', () => {
  loadCourse();
});
