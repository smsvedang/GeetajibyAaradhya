/*********************************
 * GLOBAL STATE
 *********************************/
let quizData = null;
let userAnswers = {};

// Correctly get user mobile
let userMobile = null;
try {
    const u = JSON.parse(localStorage.getItem("gitadhya_user"));
    if (u && u.mobile) userMobile = u.mobile;
} catch (e) {
    // ignore
}
if (!userMobile) {
    userMobile = localStorage.getItem("user_mobile");
}

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
        // 1. Load Quiz structure
        const res = await fetch(`/api/quiz/${courseId}`);
        if (!res.ok) throw new Error("Quiz not found");

        quizData = await res.json();

        if (!quizData.questions || quizData.questions.length === 0) {
            alert("Quiz questions missing");
            return;
        }

        // 2. Check if user already passed (Prevent re-attempt)
        if (userMobile) {
            try {
                const progRes = await fetch(`/api/progress/${userMobile}/${courseId}`);
                if (progRes.ok) {
                    const prog = await progRes.json();
                    if (prog.quizPassed) {
                        // Already passed! Show result immediately
                        showResultUI(true, prog.quizScore || 100, quizData.passPercentage || 50);
                        return;
                    }
                }
            } catch (err) {
                console.error("Progress check failed", err);
            }
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
                ${q.options.map((opt, optIndex) => `
                    <label class="quiz-radio">
                        <input type="radio"
                               name="q${qIndex}"
                               value="${optIndex}"
                               onchange="userAnswers[${qIndex}] = ${optIndex}">
                        ${opt}
                    </label>
                `).join("")}
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
    const passingMarks = Number(quizData.passPercentage || 50);
    const isPassed = percentage >= passingMarks;

    /* SAVE RESULT (PASS & FAIL BOTH) */
    if (userMobile) {
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
    } else {
        alert("Not logged in. Progress won't be saved.");
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
    const headerTitle = document.querySelector("h1"); // Adjust title

    // ❌ Submit button hamesha hata do
    if (submitBtn) submitBtn.style.display = "none";
    if (headerTitle) headerTitle.textContent = "Quiz Results";

    quizQuestions.innerHTML = `
        <div class="quiz-result ${passed ? "pass" : "fail"}">
            <h2>${passed ? "🎉 Congratulations!" : "❌ Quiz Failed"}</h2>
            <p>Your Score: <b>${score}%</b></p>
            <p>Passing Marks: <b>${passingMarks}%</b></p>
            
            ${passed ? '<p style="color:green; margin-top:10px;">You have officially passed this course!</p>' : ''}

            <div style="margin-top:20px;">
                ${passed
            ? `
                          <button class="primary-btn" onclick="goToCourse()">
                              Claim Certificate
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
    // Redirect to courses.html where the certificate logic exists
    window.location.href = `/courses.html?courseId=${courseId}&quizResult=pass`;
}

function backToCourse() {
    window.location.href = `/courses.html?courseId=${courseId}`;
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
