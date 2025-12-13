const params = new URLSearchParams(location.search);
const courseId = params.get('course');
const passPercent = Number(quiz.passPercent || 50);

let quizData = [];

async function loadQuiz() {
    const r = await fetch(`/api/quiz/${courseId}`);
    quizData = await r.json();

    const form = document.getElementById('quiz-form');
    form.innerHTML = '';

    quizData.questions.forEach((q, i) => {
        form.innerHTML += `
            <div class="course-card">
                <p><b>Q${i+1}. ${q.question}</b></p>
                ${q.options.map((o, idx)=>`
                    <label>
                        <input type="radio" name="q${i}" value="${idx}">
                        ${o}
                    </label><br>
                `).join('')}
            </div>
        `;
    });
}

async function submitQuiz() {
    const res = await fetch(`/api/quiz/${courseId}`);
    const quiz = await res.json();

    let score = 0;

    quiz.questions.forEach((q, i) => {
        const selected = document.querySelector(
            `input[name="q${i}"]:checked`
        );

        if (selected && Number(selected.value) === Number(q.answer)) {
            score++;
        }
    });

    const percent = (score / quiz.questions.length) * 100;

    if (percent >= quiz.passPercent) {
        alert(`✅ Passed! Score: ${percent.toFixed(0)}%`);

        // Redirect back to course
        window.location.href =
            `/courses.html?course=${courseId}&quiz=passed`;
    } else {
        alert(`❌ Failed! Score: ${percent.toFixed(0)}%`);
    }
}

loadQuiz();
