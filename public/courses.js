async function loadCourses() {
    const container = document.getElementById('courses-container');

    if (!container) {
        console.error('courses-container not found');
        return;
    }

    container.innerHTML = '<p>Loading courses...</p>';

    try {
        const res = await fetch('/api/courses');

        if (!res.ok) {
            throw new Error('API error');
        }

        const courses = await res.json();

        if (!Array.isArray(courses) || courses.length === 0) {
            container.innerHTML = '<p>No courses available yet.</p>';
            return;
        }

        container.innerHTML = '';

        courses.forEach(course => {
            const div = document.createElement('div');
            div.className = 'course-card';

            div.innerHTML = `
                <h2>${course.title}</h2>
                <p>${course.description || ''}</p>
                <p><strong>Adhyay:</strong> ${course.adhyay || '-'}</p>
                <p><strong>Total Shlokas:</strong> ${course.shlokas?.length || 0}</p>
                <a href="/course.html?id=${course._id}">
                    Start Course
                </a>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML =
            '<p style="color:red;">Failed to load courses. Please try again later.</p>';
    }
}

// Run on page load
loadCourses();
