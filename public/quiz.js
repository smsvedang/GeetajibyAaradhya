const params = new URLSearchParams(location.search);
const courseId = params.get('course');

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
    let score = 0;

    quizData.questions.forEach((q, i) => {
        const ans = document.querySelector(`input[name="q${i}"]:checked`);
        if (ans && Number(ans.value) === q.correct) {
            score++;
        }
    });

    const percent = (score / quizData.questions.length) * 100;

    const r = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ courseId, percent })
    });

    const res = await r.json();

    if (res.pass) {
        alert('Quiz Passed!');
        window.location.href = `/courses.html?course=${courseId}&quiz=passed`;
    } else {
        alert('Quiz Failed. Try again.');
    }
}

loadQuiz();
