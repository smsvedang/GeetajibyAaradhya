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
    throw new Error("Course ID not found in URL");
}

/*********************************
 * LOAD QUIZ FROM SERVER
 *********************************/
async function loadQuiz() {
    try {
        const res = await fetch(`/api/quiz/${courseId}`);

        if (!res.ok) {
            alert("Quiz not found for this course");
            return;
        }

        quizData = await res.json();

        if (
            !quizData ||
            !Array.isArray(quizData.questions) ||
            quizData.questions.length === 0
        ) {
            alert("Quiz questions are missing");
            return;
        }

        renderQuiz();
    } catch (err) {
        console.error("Quiz load error:", err);
        alert("Failed to load quiz");
    }
}

/*********************************
 * RENDER QUIZ (CARDS + OPTIONS)
 *********************************/
function renderQuiz() {
    const container = document.getElementById("quiz-questions");
    container.innerHTML = "";

    quizData.questions.forEach((q, qIndex) => {
        const card = document.createElement("div");
        card.className = "quiz-card";

        card.innerHTML = `
            <h4>Q${qIndex + 1}. ${q.question}</h4>
            ${q.options
                .map(
                    (opt, optIndex) => `
                <div class="quiz-option"
                     onclick="selectOption(${qIndex}, ${optIndex}, this)">
                    ${opt}
                </div>
            `
                )
                .join("")}
        `;

        container.appendChild(card);
    });
}

/*********************************
 * OPTION SELECT (HIGHLIGHT)
 *********************************/
function selectOption(questionIndex, optionIndex, element) {
    userAnswers[questionIndex] = optionIndex;

    const options =
        element.parentElement.querySelectorAll(".quiz-option");

    options.forEach(opt => opt.classList.remove("selected"));
    element.classList.add("selected");
}

/*********************************
 * SUBMIT QUIZ (STRICT PASS LOGIC)
 *********************************/
async function submitQuiz(e) {
    if (e) e.preventDefault();

    if (!quizData) {
        alert("Quiz not loaded");
        return;
    }

    const totalQuestions = quizData.questions.length;
    let correctAnswers = 0;

    quizData.questions.forEach((q, index) => {
        if (userAnswers[index] === q.correctIndex) {
            correctAnswers++;
        }
    });

    const percentage = Math.round(
        (correctAnswers / totalQuestions) * 100
    );

    const passingMarks = Number(quizData.passingMarks || 50);

    /* ❗ STRICT CHECK */
    if (percentage < passingMarks) {
        alert(
            `❌ Failed\n\nScore: ${percentage}%\nMinimum Required: ${passingMarks}%`
        );
        return;
    }

    /* ✅ SAVE QUIZ PASS */
    try {
        await fetch("/api/quiz/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mobile: userMobile,
                courseId,
                score: percentage
            })
        });

        alert(`🎉 Passed!\nScore: ${percentage}%`);

        window.location.href = `/courses.html?courseId=${courseId}&quiz=passed`;
    } catch (err) {
        console.error("Quiz submit error:", err);
        alert("Error saving quiz result");
    }
}

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
    loadQuiz();

    const form = document.getElementById("quiz-form");
    if (form) {
        form.addEventListener("submit", submitQuiz);
    }
});
