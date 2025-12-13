const params = new URLSearchParams(location.search);
const courseId = params.get('id');

async function loadCourse() {
    if (!courseId) return;

    const titleEl = document.getElementById('course-title');
    const container = document.getElementById('course-container');

    try {
        const res = await fetch(`/api/courses/${courseId}`);
        const course = await res.json();

        titleEl.textContent = course.title;

        if (!course.shlokas || course.shlokas.length === 0) {
            container.innerHTML = '<p>No shlokas in this course.</p>';
            return;
        }

        course.shlokas.forEach((s, index) => {
            const div = document.createElement('div');
            div.className = 'shloka-card';

            div.innerHTML = `
                <h3>Shloka ${index + 1}</h3>
                <p>${s.text || ''}</p>

                <iframe
                    src="https://www.youtube.com/embed/${s.video_id}"
                    allowfullscreen>
                </iframe>

                <button class="complete-btn">
                    Mark as Completed
                </button>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML =
            '<p style="color:red;">Failed to load course.</p>';
    }
}

loadCourse();
