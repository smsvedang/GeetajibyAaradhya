const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// --- Middleware ---
// यह फॉर्म से आने वाले डेटा को पढ़ने में मदद करता है
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// यह 'public' फोल्डर से HTML/CSS फाइलों को परोसता (serve) है
app.use(express.static(path.join(__dirname, 'public')));


// --- MongoDB Connection ---
// !! बहुत ज़रूरी: 'YOUR_CONNECTION_STRING' को अपने MongoDB Atlas के लिंक से बदलें !!
// यह लिंक आपको MongoDB Atlas वेबसाइट पर "Connect" -> "Connect your application" से मिलेगा
const dbURI = "mongodb+srv://aardhyageetaji:geetajibyaaradhya@aaradhyageetaji.eqjnpqo.mongodb.net/AaradhyaDB?appName=Aaradhyageetaji"; 

mongoose.connect(dbURI)
    .then(() => console.log('MongoDB से जुड़ गए!'))
    .catch(err => console.log(err));


// --- API Routes (अभी खाली हैं) ---
// यहाँ हम लॉगिन, श्लोक जोड़ने, और श्लोक पाने के लिए कोड लिखेंगे


// --- Server Start ---
// Vercel खुद पोर्ट (Port) तय करता है, इसलिए हम process.env.PORT का इस्तेमाल करेंगे
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`सर्वर ${PORT} पर चल रहा है`);
});

// Vercel के लिए ज़रूरी एक्सपोर्ट
module.exports = app;