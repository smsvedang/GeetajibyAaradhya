# Geeta Saarathi AI - Updates & Fixes

## समस्याएं जो ठीक की गई हैं (Issues Fixed):

### 1. **Fallback Shloka - हमेशा 2.47 ही क्यों (Fixed: Varied Fallback Shlokas)**
   - **पहले:** AI fail होने पर हमेशा Gita 2.47 (`कर्मण्येवाधिकारस्ते`) return करता था
   - **अब:** 6 different shlokas में से random select करता है:
     - Gita 2.14 - दुःख-सुख की अस्थिरता पर
     - Gita 3.35 - अपना धर्म निभाने पर  
     - Gita 2.47 - कर्म पर अधिकार (पहले जैसा)
     - Gita 6.6 - आत्मनियंत्रण पर
     - Gita 18.63 - ज्ञान से आत्मबोध पर
     - Gita 5.18 - विद्वान ब्राह्मण पर

### 2. **Window/Session Token Limit - नई System (Changed: Per-Window → Per-Session)**
   - **पहले:** 3 मैसेजेस per day का limit
   - **अब:** 3 **Windows/Sessions** per day
   - एक window में unlimited messages रख सकते हो (conversation context preserved)
   - हर window open करने पर एक session consume होता है
   - Limit reset होता है automatically हर रोज IST timezone में

### 3. **AI Misunderstanding को Handle करना (New: Clarification Requests)**
   - **पहले:** अगर AI समझ नहीं पाता तो shloka return करता था
   - **अब:** 
     - AI को सिखाया गया है clarification पूछने के लिए
     - ChatGPT की तरह "Aapka matlab kya hai?" पूछेगा अगर unclear हो
     - Conversation history काम कर रहा है same window में

### 4. **Gita Knowledge Q&A - बिना Personal Guidance के (New: `/api/gita-qa` endpoint)**
   - **नया endpoint:** `POST /api/gita-qa`
   - सिर्फ Gita knowledge questions के लिए (e.g., "Karma kya hai?", "Krishna kaun hain?")
   - छोटा response (2-3 lines) + relevant shloka reference
   - **Not** a guidance tool, **की** educational tool
   - Window limit consume नहीं करता

### 5. **Conversation Memory in Same Window (New: ChatSession Model)**
   - **नया MongoDB Collection:** `ChatSession`
   - हर window का अपना unique `sessionId` होगा
   - Previous messages preserved रहते हैं same window में
   - AI को पिछली बातचीत के context में respond करने देता है

---

## Frontend में Changes (What Frontend Needs to Do):

### 1. **SessionId Generate करना**
```javascript
// Frontend me जब window/chat open हो
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem('currentSessionId', sessionId);
```

### 2. **Geeta Saarathi API Call Updated**
```javascript
// पहले:
fetch('/api/geeta-saarathi', {
    method: 'POST',
    body: JSON.stringify({ message, userId })
})

// अब:
fetch('/api/geeta-saarathi', {
    method: 'POST',
    body: JSON.stringify({ 
        message, 
        userId,
        sessionId  // 👈 नया parameter
    })
})
```

### 3. **Response Structure Updated**
```javascript
// पहले:
{
    response: "...",
    remaining_limit: 2,
    used_today: 1,
    daily_limit: 3
}

// अब:
{
    response: "...",
    session_id: "session_xyz",
    is_new_session: true/false,
    message_count: 5,          // messages in this window
    sessions_limit: 3,         // daily window limit
    sessions_today: 1,         // windows opened today
    privacy_notice: "..."
}
```

### 4. **Gita Q&A API (Knowledge Questions)**
```javascript
// यह use करो सिर्फ knowledge questions के लिए
fetch('/api/gita-qa', {
    method: 'POST',
    body: JSON.stringify({
        question: "Karma kya hota hai?",
        userId: student._id,      // optional
        sessionId: "session_xyz"   // optional
    })
})

// Response:
{
    answer: "Karma matlab action...",
    is_knowledge_qa: true,
    question: "Karma kya hota hai?"
}
```

---

## Database Schema Changes:

### Student Schema Updates:
```javascript
// पहले:
{
    daily_limit: 3,      // messages per day
    used_today: 0,       // messages today
    last_reset_date: String
}

// अब:
{
    daily_limit: 3,          // windows/sessions per day
    sessions_today: 0,       // windows opened today
    last_reset_date: String  // IST date
}
```

### नया ChatSession Collection:
```javascript
{
    userId: ObjectId,
    sessionId: String,           // unique per window
    startedAt: Date,
    lastMessageAt: Date,
    messageCount: Number,        // messages in this window
    messages: [{                 // conversation history
        role: 'user'|'assistant',
        content: String,
        timestamp: Date
    }],
    isActive: Boolean,
    expiresAt: Date              // auto-delete after 24h
}
```

---

## API Endpoint Changes & Additions:

### Updated Endpoints:
1. `/api/student/register` - returns `sessions_today` instead of `used_today`
2. `/api/student/login` - returns `sessions_today` instead of `used_today`
3. `/api/student/update` - returns `sessions_today` instead of `used_today`
4. `/api/reset-daily-limit` - resets `sessions_today` instead of `used_today`
5. `/api/admin-update-limit` - अब daily session limit set करता है
6. `/api/admin/detailed-students` - shows `sessions_today` instead of `used_today`

### नए Endpoints:
1. `POST /api/gita-qa` - Knowledge Q&A (doesn't consume window)

---

## Log Messages (Server Side):

जब testing करो, यानी messages देखो:
```
✅ New session created for user: xyz
📊 User sessions_today: 1/3
💬 Message stored in session
♻️ Session resetting - new day
```

---

## Testing Checklist:

- [ ] Multiple messages in same window don't consume extra limit
- [ ] New window opens → session counter increases
- [ ] Limit resets at midnight IST
- [ ] AI asks clarification when confused (not just shloka)
- [ ] Fallback shloka changes on each AI failure (random)
- [ ] Conversation history works in same window
- [ ] `/api/gita-qa` returns knowledge answers (short format)
- [ ] Admin can update daily_limit
- [ ] Old `used_today` field doesn't break anything

---

## Important Notes:

⚠️ **Backward Compatibility:**
- पुराने students जिनके पास `used_today` field है, वह migrate नहीं होंगे automatically
- Manual migration करना पड़ सकता है अगर production में issue हो

🔧 **Migration (अगर जरूरत हो):**
```javascript
// Run once in MongoDB:
db.students.updateMany({}, { 
    $set: { sessions_today: 0 }, 
    $unset: { used_today: 1 } 
})
```

---

## Request Example:

```bash
# Geeta Saarathi (Personal Guidance - consumes 1 window)
curl -X POST http://localhost:3000/api/geeta-saarathi \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Mujhe anxiety aati hai",
    "userId": "507f1f77bcf86cd799439011",
    "sessionId": "session_1234567_abc"
  }'

# Gita Q&A (Knowledge - doesn't consume window)
curl -X POST http://localhost:3000/api/gita-qa \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Bhagavad Gita me kitne adhyay hain?",
    "userId": "507f1f77bcf86cd799439011",
    "sessionId": "session_1234567_abc"
  }'
```

---

## Hindi Explanation:

**Pehle vs Aaj:**
- पहले: हर message पर हर day का limit काटा जाता था (3 messages/day)
- अब: हर **window** पर limit काटा जाता है (3 windows/day)
- एक window में जितने मन करो उतने message भेज सकते हो

**AI Improvement:**
- पहले: AI nahi samjha to always 2.47 ka shloka de de
- अब: AI confuse hote hue clarify kahe to alag alag shlokas de aur context remember kahe

**नए Features:**
1. Session memory - पुरानी बातचीत याद रहती है
2. Knowledge Q&A - Gita के facts पूछ सकते हो
3. Better AI - ChatGPT जैसा clarification मांगता है
