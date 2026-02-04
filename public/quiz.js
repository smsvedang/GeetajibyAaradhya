/*********************************
 * GLOBAL STATE
 *********************************/
let quizData = null;
let userAnswers = {};
let currentCourseTitle = "";
let certificateRequested = false;

// Correctly get user mobile
let userMobile = null;
let userName = ""; // Try to get name too for pre-filling
try {
    const u = JSON.parse(localStorage.getItem("gitadhya_user"));
    if (u) {
        if (u.mobile) userMobile = u.mobile;
        if (u.name) userName = u.name;
    }
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
        // 0. Fetch Course Details (for Title)
        try {
            const courseRes = await fetch(`/api/courses/${courseId}`);
            if (courseRes.ok) {
                const c = await courseRes.json();
                currentCourseTitle = c.title;
            }
        } catch (e) { console.error("Course title fetch error", e); }

        // 1. Load Quiz structure
        const res = await fetch(`/api/quiz/${courseId}`);
        if (!res.ok) throw new Error("Quiz not found");

        quizData = await res.json();

        if (!quizData.questions || quizData.questions.length === 0) {
            alert("Quiz questions missing");
            return;
        }

        // Check local storage for cert request
        if (localStorage.getItem(`cert_submitted_${courseId}`)) {
            certificateRequested = true;
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

    // Build the HTML
    let html = `
        <div class="quiz-result ${passed ? "pass" : "fail"}">
            <h2>${passed ? "🎉 Congratulations!" : "❌ Quiz Failed"}</h2>
            <p>Your Score: <b>${score}%</b></p>
            <p>Passing Marks: <b>${passingMarks}%</b></p>
            
            ${passed ? '<p style="color:green; margin-top:10px;">You have officially passed this course!</p>' : ''}
    `;

    if (passed) {
        // Show Certificate Form directly if not already requested
        if (certificateRequested) {
            html += `
                <div class="result-action-box" style="background:#e8f5e9; padding:20px; border-radius:10px; margin-top:20px;">
                    <h3 style="color:#2e7d32; margin-top:0;">Certificate Status</h3>
                    <p>✅ Your certificate request has been submitted successfully.</p>
                    <p>Admin approval is pending. You will be notified once approved.</p>
                    <button class="primary-btn" style="margin-top:15px; width:100%;" onclick="backToCourse()">
                        Back to Course
                    </button>
                </div>
            `;
        } else {
            html += `
                <div class="result-action-box" style="background:#fff8e1; padding:20px; border-radius:10px; margin-top:20px; border:1px solid #ffecb3;">
                    <h3 style="color:#f57f17; margin-top:0;">🎓 Claim Your Certificate</h3>
                    <p style="margin-bottom:15px; font-size:0.9rem;">Please confirm your details for the certificate.</p>
                    
                    <div style="text-align:left;">
                        <label style="font-size:0.85rem; font-weight:bold; color:#555;">Full Name (for Certificate)</label>
                        <input id="cert-name-input" type="text" value="${userName}" placeholder="Enter Full Name" 
                            style="width:100%; padding:10px; margin:5px 0 15px; border:1px solid #ddd; border-radius:6px;">
                        
                        <label style="font-size:0.85rem; font-weight:bold; color:#555;">Mobile Number</label>
                        <input id="cert-mobile-input" type="text" value="${userMobile}" readonly 
                            style="width:100%; padding:10px; margin:5px 0 15px; border:1px solid #ddd; border-radius:6px; background:#f0f0f0; color:#777;">
                    </div>

                    <button class="primary-btn" style="width:100%;" onclick="requestCertificateDirectly()">
                        Request Certificate Now
                    </button>
                    <button class="text-btn" style="width:100%; margin-top:10px; background:none; border:none; text-decoration:underline; cursor:pointer;" onclick="backToCourse()">
                        Return to Course
                    </button>
                </div>
            `;
        }
    } else {
        // Failed
        html += `
            <div style="margin-top:20px;">
                <button class="secondary-btn" onclick="backToCourse()">
                    Back to Course
                </button>
                <button class="primary-btn" style="margin-left:10px;" onclick="retryQuiz()">
                    Retry Quiz
                </button>
            </div>
        `;
    }

    html += `</div>`;
    quizQuestions.innerHTML = html;
}

/*********************************
 * ACTIONS
 *********************************/
async function requestCertificateDirectly() {
    const nameInput = document.getElementById('cert-name-input');
    const mobileInput = document.getElementById('cert-mobile-input');

    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();

    if (!name) {
        alert("Please enter your name for the certificate.");
        return;
    }

    // Show loading state
    const btn = document.querySelector("button[onclick='requestCertificateDirectly()']");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
        const res = await fetch('/api/certificate/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                mobile,
                courseTitle: currentCourseTitle || "Course Certificate",
                language: 'hi'
            })
        });

        if (res.ok) {
            localStorage.setItem(`cert_submitted_${courseId}`, 'true');
            certificateRequested = true;
            // Refresh UI to show success
            // pass dummy score/marks to keep UI consistent or retrieve from DOM/State if needed. 
            // Ideally we should just refresh the view.
            // We can just call showResultUI again with 'true' (passed)
            // We need to re-fetch the scores we rendered or just use placeholders if they are not critical for THIS specific reload
            // Best to just reload page or simpler: update local state and re-render showResultUI

            // Let's assume passed=true. We need scores. 
            // We can grab them from the DOM or State if we stored it interactively, 
            // but simpler is to reload the page because loadQuiz handles the check now.
            window.location.reload();
        } else {
            const d = await res.json();
            // If already exists, treat as success
            if (d.message && d.message.includes("already submitted")) {
                localStorage.setItem(`cert_submitted_${courseId}`, 'true');
                window.location.reload();
            } else {
                alert("Request failed: " + (d.message || "Unknown error"));
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    } catch (err) {
        console.error(err);
        alert("Connection error. Please try again.");
        btn.disabled = false;
        btn.textContent = originalText;
    }
}


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
