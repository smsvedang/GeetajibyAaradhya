const express = require('express');
const app = express();
const PORT = 3000;

// एक टेस्ट रूट
app.get('/', (req, res) => {
    res.send('सर्वर काम कर रहा है!');
});

// सर्वर शुरू करें
app.listen(PORT, () => {
    console.log(`सर्वर http://localhost:${PORT} पर चल रहा है`);
});