/****************************
 * QUIZ.JS – FINAL VERSION
 ****************************/

/* ===== GLOBALS ===== */
let quiz = null;
let courseId = null;

/* ===== INIT ===== */
const params = new URLSearchParams(window.location.search);
courseId = params.get('course');

if (!courseId) {
    alert('Course ID missing');
}

/* ===== LOAD QUIZ ===== */
async function loadQuiz() {
    try {
        const res = await fetch(`/api/quiz/${courseId}`);
        quiz = await res.json();

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            document.getElementById('quiz-form').innerHTML =
                '<p>No quiz available for this course.</p>';
            return;
        }

        renderQuiz();
    } catch (err) {
        console.error(err);
        alert('Failed to load quiz');
    }
}

/* ===== RENDER QUIZ ===== */
function renderQuiz() {
    const form = document.getElementById('quiz-form');
    form.innerHTML = '';

    quiz.questions.forEach((q, i) => {
        form.innerHTML += `
            <div class="course-card">
                <p><b>Q${i + 1}. ${q.question}</b></p>

                ${q.options.map((o, idx) => `
                    <label>
                        <input type="radio" name="q${i}" value="${idx}">
                        ${o}
                    </label><br>
                `).join('')}
            </div>
        `;
    });
}

/* ===== SUBMIT QUIZ ===== */
async function submitQuiz() {
    let score = 0;

    quiz.questions.forEach((q, i) => {
        const selected = document.querySelector(
            `input[name="q${i}"]:checked`
        );

        const chosen = selected ? Number(selected.value) : -1;
        const correct = Number(q.correctIndex);

        if (chosen === correct) {
            score++;
        }
    });

    const total = quiz.questions.length;
    const percent = Math.round((score / total) * 100);

    // 🔐 SAFE PASS %
    const passPercentage = Number(quiz.passPercentage || 50);

   if (percentage >= quiz.passPercentage) {

    // ✅ SAVE PASS STATUS TO SERVER
    await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mobile: userMobile,
            courseId,
            score: percentage
        })
    });

    alert('Quiz Passed 🎉');
    window.location.href = `/courses.html?course=${courseId}`;
}
}

/* ===== START ===== */
loadQuiz();
