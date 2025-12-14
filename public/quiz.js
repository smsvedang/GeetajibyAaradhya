/************************
 * GLOBAL
 ************************/
let quizData = null;
let userMobile = localStorage.getItem('userMobile');

/************************
 * GET COURSE ID
 ************************/
const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

if (!courseId) {
    alert('Course ID not found');
}

/************************
 * LOAD QUIZ
 ************************/
async function loadQuiz() {
    const res = await fetch(`/api/quiz/${courseId}`);

    if (!res.ok) {
        alert('Quiz not found for this course');
        return;
    }

    quizData = await res.json();

    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        alert('Quiz questions missing');
        return;
    }

    renderQuiz();
}

/************************
 * RENDER QUIZ
 ************************/
function renderQuiz() {
    const box = document.getElementById('quiz-questions');
    box.innerHTML = '';

    quizData.questions.forEach((q, i) => {
        box.innerHTML += `
            <div class="quiz-question">
                <p><b>Q${i + 1}.</b> ${q.question}</p>

                ${q.options.map((opt, idx) => `
                    <label>
                        <input type="radio" name="q${i}" value="${idx}">
                        ${opt}
                    </label><br>
                `).join('')}
            </div>
        `;
    });
}

/************************
 * SUBMIT QUIZ
 ************************/
async function submitQuiz() {
    if (!quizData) {
        alert('Quiz not loaded');
        return;
    }

    let score = 0;

    quizData.questions.forEach((q, i) => {
        const selected = document.querySelector(
            `input[name="q${i}"]:checked`
        );

        if (selected && Number(selected.value) === q.correctIndex) {
            score++;
        }
    });

    const percent = Math.round(
        (score / quizData.questions.length) * 100
    );

    if (percent < quizData.passingMarks) {
        alert(`Failed ❌ You scored ${percent}%`);
        return;
    }

    // ✅ SAVE QUIZ PASS
    await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mobile: userMobile,
            courseId,
            score: percent
        })
    });

    alert(`Passed ✅ ${percent}%`);

    // 🔥 IMPORTANT: go back to course page
    window.location.href = `/courses.html?courseId=${courseId}&quiz=passed`;
}

/************************
 * INIT
 ************************/
loadQuiz();
