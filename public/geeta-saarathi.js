(function () {
    const existing = document.getElementById('geeta-saarathi-root');
    if (existing) return;

    const style = document.createElement('style');
    style.textContent = `
    #geeta-saarathi-root{position:fixed;right:20px;bottom:20px;z-index:99999;font-family:Outfit,system-ui,sans-serif}
    .gs-trigger{width:64px;height:64px;border-radius:999px;border:none;cursor:pointer;background:#f97316;color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.25);font-size:28px}
    .gs-modal{display:none;position:absolute;right:0;bottom:78px;width:min(360px,calc(100vw - 24px));background:#fff;border-radius:14px;overflow:hidden;border:1px solid #fed7aa;box-shadow:0 16px 40px rgba(0,0,0,.25)}
    .gs-head{background:#f97316;color:#fff;padding:12px 14px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
    .gs-body{padding:12px;max-height:60vh;overflow:auto}
    .gs-privacy{font-size:12px;color:#7c2d12;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px;margin-bottom:8px}
    .gs-chat{display:flex;flex-direction:column;gap:8px}
    .gs-msg{padding:10px;border-radius:10px;white-space:pre-wrap;line-height:1.4;font-size:14px}
    .gs-user{background:#fff7ed;border:1px solid #fed7aa;align-self:flex-end}
    .gs-ai{background:#f8fafc;border:1px solid #e2e8f0;align-self:flex-start}
    .gs-foot{padding:10px;border-top:1px solid #fde68a;display:flex;gap:8px}
    .gs-input{flex:1;border:1px solid #fdba74;border-radius:8px;padding:10px;font:inherit;font-size:14px;resize:vertical;min-height:40px;max-height:120px}
    .gs-send{border:none;background:#f97316;color:#fff;border-radius:8px;padding:0 14px;cursor:pointer}
    .gs-muted{font-size:12px;color:#6b7280;padding:0 12px 10px}
    @media (max-width:640px){#geeta-saarathi-root{right:12px;bottom:12px}.gs-trigger{width:56px;height:56px;font-size:24px}}
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'geeta-saarathi-root';
    root.innerHTML = `
        <div class="gs-modal" id="gs-modal">
            <div class="gs-head">
                <span>GEETA SAARATHI</span>
                <button id="gs-close" style="border:none;background:transparent;color:#fff;font-size:18px;cursor:pointer">✕</button>
            </div>
            <div class="gs-body">
                <div class="gs-privacy">Aapki samasya kisi server par save nahi ki jaati. Yeh vartalaap gopniya hai.</div>
                <div id="gs-chat" class="gs-chat"></div>
            </div>
            <div class="gs-muted" id="gs-limit"></div>
            <div class="gs-foot">
                <textarea id="gs-input" class="gs-input" placeholder="Apni samasya likhiye..."></textarea>
                <button id="gs-send" class="gs-send">Send</button>
            </div>
        </div>
        <button id="gs-trigger" class="gs-trigger" aria-label="Open Geeta Saarathi">🕉</button>
    `;
    document.body.appendChild(root);

    const modal = root.querySelector('#gs-modal');
    const trigger = root.querySelector('#gs-trigger');
    const closeBtn = root.querySelector('#gs-close');
    const sendBtn = root.querySelector('#gs-send');
    const input = root.querySelector('#gs-input');
    const chat = root.querySelector('#gs-chat');
    const limit = root.querySelector('#gs-limit');

    function currentUser() {
        try {
            return JSON.parse(localStorage.getItem('gitadhya_user')) || null;
        } catch {
            return null;
        }
    }

    function addMessage(content, cls) {
        const node = document.createElement('div');
        node.className = `gs-msg ${cls}`;
        node.textContent = content;
        chat.appendChild(node);
        chat.scrollTop = chat.scrollHeight;
    }

    async function askSaarathi() {
        const user = currentUser();
        if (!user || !user.userId) {
            addMessage('Login zaroori hai. Kripya dobara login karein.', 'gs-ai');
            return;
        }
        const message = input.value.trim();
        if (!message) return;
        input.value = '';
        addMessage(message, 'gs-user');

        try {
            sendBtn.disabled = true;
            const res = await fetch('/api/geeta-saarathi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, userId: user.userId })
            });
            const data = await res.json();
            if (!res.ok) {
                addMessage(data.response || data.message || 'Saarathi unavailable.', 'gs-ai');
            } else {
                addMessage(data.response, 'gs-ai');
                if (typeof data.remaining_limit === 'number') {
                    limit.textContent = `Aaj ka remaining margdarshan: ${data.remaining_limit}`;
                }
            }
        } catch {
            addMessage('Network error. Kripya dobara koshish karein.', 'gs-ai');
        } finally {
            sendBtn.disabled = false;
        }
    }

    trigger.addEventListener('click', function () {
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    });
    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });
    sendBtn.addEventListener('click', askSaarathi);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askSaarathi();
        }
    });
})();
