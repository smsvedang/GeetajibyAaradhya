(function () {
    const existing = document.getElementById('geeta-saarathi-root');
    if (existing) return;

    const style = document.createElement('style');
    style.textContent = `
    #geeta-saarathi-root{position:fixed;right:18px;bottom:18px;z-index:99999;font-family:Outfit,system-ui,sans-serif}
    .gs-trigger{width:60px;height:60px;border-radius:999px;border:none;background:#ff7a00;color:#fff;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.26);display:flex;align-items:center;justify-content:center}
    .gs-modal{display:none;position:absolute;right:0;bottom:74px;width:min(380px,calc(100vw - 22px));background:#fff;border:1px solid #ffd9b8;border-radius:14px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.22)}
    .gs-head{background:#ff7a00;color:#fff;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px}
    .gs-head-left{display:flex;align-items:center;gap:8px;font-weight:700}
    .gs-head-actions{display:flex;align-items:center;gap:6px}
    .gs-icon-btn{border:none;background:rgba(255,255,255,.2);color:#fff;border-radius:8px;padding:4px 7px;cursor:pointer}
    .gs-progress-wrap{text-align:right;min-width:120px}
    .gs-progress{display:flex;justify-content:flex-end;gap:3px;margin-bottom:2px}
    .gs-seg{width:14px;height:6px;border-radius:999px;background:rgba(255,255,255,.45)}
    .gs-seg.fill{background:#fff}
    .gs-progress-text{font-size:11px;font-weight:700}
    .gs-progress-text.pulse{animation:gsPulse 1.2s infinite}
    @keyframes gsPulse{0%{opacity:1}50%{opacity:.45}100%{opacity:1}}
    .gs-body{padding:10px;max-height:52vh;overflow:auto;background:#fff}
    .gs-privacy{font-size:12px;color:#7c2d12;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px;margin-bottom:8px}
    .gs-chat{display:flex;flex-direction:column;gap:8px}
    .gs-msg{padding:9px 10px;border-radius:9px;white-space:pre-wrap;line-height:1.38;font-size:14px}
    .gs-user{background:#fff7ed;border:1px solid #fed7aa;align-self:flex-end}
    .gs-ai{background:#f8fafc;border:1px solid #e2e8f0;align-self:flex-start}
    .gs-ai-wrap{align-self:flex-start;max-width:100%}
    .gs-msg-actions{display:flex;gap:6px;margin-top:5px}
    .gs-msg-btn{border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:3px 7px;font-size:12px;cursor:pointer}
    .gs-foot{position:sticky;bottom:0;background:#fff;padding:10px;border-top:1px solid #fde2c8;display:flex;gap:8px}
    .gs-input{flex:1;border:1px solid #fcb67f;border-radius:8px;padding:10px;font:inherit;font-size:14px;resize:vertical;min-height:40px;max-height:120px}
    .gs-send{border:none;background:#ff7a00;color:#fff;border-radius:8px;padding:0 14px;cursor:pointer}
    .gs-warning-footer{background:#fff3cd;border-top:1px solid #fde2c8;padding:8px 10px;font-size:12px;color:#856404;line-height:1.4;text-align:center}
    .gs-warning-footer strong{display:block;margin-bottom:3px;color:#7c2d12}
    .gs-disabled .gs-input,.gs-disabled .gs-send{opacity:.5;cursor:not-allowed}
    @media (max-width:640px){#geeta-saarathi-root{right:10px;bottom:10px}.gs-trigger{width:56px;height:56px}}
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'geeta-saarathi-root';
    root.innerHTML = `
      <div class="gs-modal" id="gs-modal">
        <div class="gs-head">
          <div class="gs-head-left">
            <span aria-hidden="true">${chakraSvg()}</span>
            <span>Geeta Saarathi</span>
          </div>
          <div class="gs-progress-wrap">
            <div id="gs-progress" class="gs-progress"></div>
            <div id="gs-progress-text" class="gs-progress-text">0/11</div>
          </div>
          <div class="gs-head-actions">
            <button id="gs-new-window" class="gs-icon-btn" title="Fresh chat">↗</button>
            <button id="gs-close" class="gs-icon-btn" title="Close">✕</button>
          </div>
        </div>
        <div class="gs-body">
          <div class="gs-privacy">Aapki samasya kisi server par save nahi ki jaati. Yeh vartalaap gopniya hai.</div>
          <div id="gs-chat" class="gs-chat"></div>
        </div>
        <div id="gs-foot" class="gs-foot">
          <textarea id="gs-input" class="gs-input" placeholder="Apni samasya likhiye..."></textarea>
          <button id="gs-send" class="gs-send">Send</button>
        </div>
        <div class="gs-warning-footer">
          <strong>⚠️ Important Notice</strong>
          Main Geeta Saarathi hoon - therapy replacement nahi. Crisis mein Tele-MANAS: 14416 call karein.
        </div>
      </div>
      <button id="gs-trigger" class="gs-trigger" aria-label="Open Geeta Saarathi">${chakraSvg()}</button>
    `;
    document.body.appendChild(root);

    const modal = root.querySelector('#gs-modal');
    const trigger = root.querySelector('#gs-trigger');
    const closeBtn = root.querySelector('#gs-close');
    const newWindowBtn = root.querySelector('#gs-new-window');
    const chat = root.querySelector('#gs-chat');
    const input = root.querySelector('#gs-input');
    const sendBtn = root.querySelector('#gs-send');
    const foot = root.querySelector('#gs-foot');
    const progress = root.querySelector('#gs-progress');
    const progressText = root.querySelector('#gs-progress-text');

    let limitState = { daily_limit: 11, remaining_limit: 11 };

    function chakraSvg() {
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6"/><path d="M12 1.8v3.2M12 19v3.2M1.8 12H5M19 12h3.2M4.2 4.2l2.2 2.2M17.6 17.6l2.2 2.2M19.8 4.2l-2.2 2.2M6.4 17.6l-2.2 2.2"/></svg>';
    }

    function currentUser() {
        try { return JSON.parse(localStorage.getItem('gitadhya_user')) || null; } catch { return null; }
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    async function shareText(text) {
        try {
            if (navigator.share) {
                await navigator.share({ title: 'Geeta Saarathi', text });
                return true;
            }
            return copyText(text);
        } catch {
            return false;
        }
    }

    function addMessage(content, cls) {
        if (cls === 'gs-ai') {
            const wrap = document.createElement('div');
            wrap.className = 'gs-ai-wrap';
            const n = document.createElement('div');
            n.className = `gs-msg ${cls}`;
            n.textContent = content;
            const actions = document.createElement('div');
            actions.className = 'gs-msg-actions';
            actions.innerHTML = `
                <button class="gs-msg-btn" data-act="copy">Copy</button>
                <button class="gs-msg-btn" data-act="share">Share</button>
            `;
            actions.addEventListener('click', async function (e) {
                const btn = e.target.closest('button');
                if (!btn) return;
                if (btn.dataset.act === 'copy') {
                    const ok = await copyText(content);
                    btn.textContent = ok ? 'Copied' : 'Failed';
                }
                if (btn.dataset.act === 'share') {
                    const ok = await shareText(content);
                    btn.textContent = ok ? 'Shared' : 'Failed';
                }
                setTimeout(() => {
                    if (btn.dataset.act === 'copy') btn.textContent = 'Copy';
                    if (btn.dataset.act === 'share') btn.textContent = 'Share';
                }, 1200);
            });
            wrap.appendChild(n);
            wrap.appendChild(actions);
            chat.appendChild(wrap);
            chat.scrollTop = chat.scrollHeight;
            return;
        }
        const n = document.createElement('div');
        n.className = `gs-msg ${cls}`;
        n.textContent = content;
        chat.appendChild(n);
        chat.scrollTop = chat.scrollHeight;
    }

    function renderProgress() {
        const daily = Math.max(1, Number(limitState.daily_limit || 11));
        const remaining = Math.max(0, Number(limitState.remaining_limit || 0));
        const used = Math.max(0, daily - remaining);
        progress.innerHTML = '';
        for (let i = 0; i < daily; i += 1) {
            const seg = document.createElement('span');
            seg.className = `gs-seg ${i < used ? 'fill' : ''}`;
            progress.appendChild(seg);
        }
        if (remaining === 0) {
            progressText.textContent = 'Daily Limit Complete';
            progressText.classList.remove('pulse');
            foot.classList.add('gs-disabled');
            input.disabled = true;
            sendBtn.disabled = true;
        } else {
            progressText.textContent = `${used}/${daily}`;
            progressText.classList.toggle('pulse', remaining === 1);
            foot.classList.remove('gs-disabled');
            input.disabled = false;
            sendBtn.disabled = false;
        }
    }

    async function fetchLimitState() {
        const user = currentUser();
        if (!user || !user.userId) return;
        try {
            const r = await fetch(`/api/geeta-saarathi?userId=${encodeURIComponent(user.userId)}`);
            if (!r.ok) return;
            const data = await r.json();
            limitState = {
                daily_limit: Number(data.daily_limit || 11),
                remaining_limit: Number(data.remaining_limit ?? 0)
            };
            renderProgress();
        } catch { }
    }

    async function sendMessage() {
        const user = currentUser();
        if (!user || !user.userId) {
            addMessage('Login required. Kripya pehle login karein.', 'gs-ai');
            return;
        }
        const message = input.value.trim();
        if (!message || input.disabled) return;
        input.value = '';
        addMessage(message, 'gs-user');
        sendBtn.disabled = true;
        try {
            const r = await fetch('/api/geeta-saarathi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, message })
            });
            const data = await r.json();
            addMessage(data.response || data.message || 'Saarathi unavailable.', 'gs-ai');
            if (typeof data.daily_limit !== 'undefined' && typeof data.remaining_limit !== 'undefined') {
                limitState = { daily_limit: data.daily_limit, remaining_limit: data.remaining_limit };
                renderProgress();
            }
        } catch {
            addMessage('Network issue. Kripya dobara koshish karein.', 'gs-ai');
        } finally {
            sendBtn.disabled = false;
        }
    }

    trigger.addEventListener('click', function () {
        const open = modal.style.display === 'block';
        modal.style.display = open ? 'none' : 'block';
        if (!open) fetchLimitState();
    });
    closeBtn.addEventListener('click', function () { modal.style.display = 'none'; });
    newWindowBtn.addEventListener('click', function () {
        chat.innerHTML = '';
        input.value = '';
        addMessage('Nayi margdarshan window tayyar hai. Aap apni baat likhiye.', 'gs-ai');
        fetchLimitState();
    });
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    renderProgress();
})();
