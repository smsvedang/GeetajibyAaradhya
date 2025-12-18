/*********************************
 * GLOBAL STATE
 *********************************/
let quizData = null;
let userAnswers = {};
let userMobile = localStorage.getItem("userMobile");

/*********************************
 * GET COURSE ID FROM URL
 *********************************/
const params = new URLSearchParams(window.location.search);
const courseId = params.get("courseId");

if (!courseId) {
    alert("Course ID missing");
    throw new Error("Course ID not found");
}

/*********************************
 * LOAD QUIZ
 *********************************/
async function loadQuiz() {
    try {
        const res = await fetch(`/api/quiz/${courseId}`);
        if (!res.ok) throw new Error("Quiz not found");

        quizData = await res.json();

        if (!quizData.questions || quizData.questions.length === 0) {
            alert("Quiz questions missing");
            return;
        }

        renderQuiz();
    } catch (err) {
        console.error(err);
        alert("Failed to load quiz");
    }
}

/*********************************
 * RENDER QUIZ
 *********************************/
function renderQuiz() {
    const container = document.getElementById("quiz-questions");
    container.innerHTML = "";

    quizData.questions.forEach((q, qIndex) => {
        const card = document.createElement("div");
        card.className = "quiz-card";

        card.innerHTML = `
            <h4>Q${qIndex + 1}. ${q.question}</h4>
            <div class="quiz-options">
                ${q.options
                    .map(
                        (opt, optIndex) => `
                        <div class="quiz-option"
                             onclick="selectOption(${qIndex}, ${optIndex}, this)">
                            ${opt}
                        </div>`
                    )
                    .join("")}
            </div>
        `;

        container.appendChild(card);
    });
}

/*********************************
 * OPTION SELECT
 *********************************/
function selectOption(qIndex, optIndex, el) {
    userAnswers[qIndex] = optIndex;

    const options = el.parentElement.querySelectorAll(".quiz-option");
    options.forEach(o => o.classList.remove("selected"));

    el.classList.add("selected");
}

/*********************************
 * SUBMIT QUIZ
 *********************************/
async function submitQuiz(e) {
    e.preventDefault();

    const total = quizData.questions.length;
    let correct = 0;

    quizData.questions.forEach((q, i) => {
        if (userAnswers[i] === q.correctIndex) {
            correct++;
        }
    });

    const percentage = Math.round((correct / total) * 100);
    const passingMarks = Number(quizData.passingMarks || 50);
    const isPassed = percentage >= passingMarks;

    /* SAVE RESULT (PASS & FAIL BOTH) */
    try {
        await fetch("/api/quiz/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mobile: userMobile,
                courseId,
                score: percentage,
                passed: isPassed
            })
        });
    } catch (err) {
        console.error("Save error", err);
    }

    /* SHOW RESULT UI */
    showResultUI(isPassed, percentage, passingMarks);
}

/*********************************
 * RESULT UI (PASS / FAIL)
 *********************************/
function showResultUI(passed, score, passingMarks) {
    const quizQuestions = document.getElementById("quiz-questions");
    const submitBtn = document.getElementById("submit-quiz-btn");

    // ❌ Submit button hamesha hata do
    if (submitBtn) submitBtn.style.display = "none";

    quizQuestions.innerHTML = `
        <div class="quiz-result ${passed ? "pass" : "fail"}">
            <h2>${passed ? "🎉 Congratulations!" : "❌ Quiz Failed"}</h2>
            <p>Your Score: <b>${score}%</b></p>
            <p>Passing Marks: <b>${passingMarks}%</b></p>

            <div style="margin-top:20px;">
                ${
                    passed
                        ? `
                          <button class="primary-btn" onclick="goToCourse()">
                              Continue to Course
                          </button>
                        `
                        : `
                          <button class="secondary-btn" onclick="backToCourse()">
                              Back to Course
                          </button>
                          <button class="primary-btn" style="margin-left:10px;" onclick="retryQuiz()">
                              Retry Quiz
                          </button>
                        `
                }
            </div>
        </div>
    `;
}

/*********************************
 * ACTIONS
 *********************************/
function goToCourse() {
    window.location.href = `/courses?courseId=${courseId}&quizResult=pass`;
}

function backToCourse() {
    window.location.href = `/courses?courseId=${courseId}`;
}

function retryQuiz() {
    window.location.reload();
}

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    loadQuiz();

    const form = document.getElementById("quiz-form");
    if (form) form.addEventListener("submit", submitQuiz);
});
