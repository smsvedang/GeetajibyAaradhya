/**
 * 📚 VERSE DATABASE SEEDING
 * Populates Shloka collection with emotional tags
 * 
 * Run with: node api/_lib/seed-verses.js
 */

const mongoose = require('mongoose');
const Shloka = require('../../models/Shloka');
const { connectDb } = require('./db');

const TAGGED_VERSES = [
    // Duty & Karma
    {
        adhyay: 2, shloka: 47,
        tags: ['duty', 'karma', 'result-attachment', 'action'],
        category: 'duty-conflict',
        priority: 8,
        text: 'Karmaṇy-evādhikāras te mā phaleṣu kadāchana'
    },
    {
        adhyay: 2, shloka: 50,
        tags: ['equanimity', 'duty', 'karma', 'detachment'],
        category: 'duty-conflict',
        priority: 8,
        text: 'Yoga karmasu kaushalam'
    },
    
    // Fear & Courage
    {
        adhyay: 2, shloka: 3,
        tags: ['fear', 'courage', 'duty', 'weakness'],
        category: 'fear',
        priority: 9,
        text: 'Klaibyaṁ mā sma gamah partha naitaṁ tvayy upapadyate'
    },
    {
        adhyay: 15, shloka: 5,
        tags: ['fear', 'peace', 'detachment'],
        category: 'fear',
        priority: 7,
        text: 'Nirmāna-moha jitā-svarghā vidhutāya-durlabhāḥ'
    },
    
    // Mind Control & Restlessness
    {
        adhyay: 6, shloka: 34,
        tags: ['mind-control', 'restlessness', 'meditation', 'discipline'],
        category: 'restlessness',
        priority: 9,
        text: 'Chanchalaṁ hi manaḥ kṛṣṇa pramāthi balavad dṛḍham'
    },
    {
        adhyay: 6, shloka: 35,
        tags: ['mind-control', 'discipline', 'practice', 'detachment'],
        category: 'restlessness',
        priority: 8,
        text: 'Asaṁśayaṁ mahā-bāho mano durnigrahaṁ chalam'
    },
    {
        adhyay: 12, shloka: 8,
        tags: ['focus', 'meditation', 'mind-control'],
        category: 'restlessness',
        priority: 7,
        text: 'Tad etan me sukhaṁ yogi brahma-suksham anantate'
    },
    
    // Depression & Despair
    {
        adhyay: 9, shloka: 34,
        tags: ['depression', 'devotion', 'hope', 'attachment'],
        category: 'depression',
        priority: 9,
        text: 'Man-manā bhava mad-bhakto mad-yājī māṁ namaskuru'
    },
    {
        adhyay: 18, shloka: 66,
        tags: ['surrender', 'faith', 'hope', 'despair'],
        category: 'depression',
        priority: 9,
        text: 'Sarva-dharmān parityajya māṁ ekaṁ śaraṇaṁ vraja'
    },
    {
        adhyay: 2, shloka: 14,
        tags: ['temporary', 'endurance', 'suffering'],
        category: 'depression',
        priority: 8,
        text: 'Mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ'
    },
    
    // Anger & Control
    {
        adhyay: 3, shloka: 43,
        tags: ['anger', 'ego', 'control', 'detachment'],
        category: 'anger',
        priority: 8,
        text: 'Indriyāṇi paranyāhurindriyebhyaḥ paraṁ manaḥ'
    },
    {
        adhyay: 5, shloka: 22,
        tags: ['equanimity', 'detachment', 'anger'],
        category: 'anger',
        priority: 7,
        text: 'Yo yah śāstra-vidhiṁ utsṛjya vartate kāma-kārataḥ'
    },
    
    // Ego & Humility
    {
        adhyay: 2, shloka: 48,
        tags: ['equanimity', 'ego', 'detachment', 'success-failure'],
        category: 'ego',
        priority: 9,
        text: 'Yogasthah kuru karmani sangaṁ tyaktvā dhanañjaya'
    },
    {
        adhyay: 16, shloka: 4,
        tags: ['pride', 'ego', 'arrogance'],
        category: 'ego',
        priority: 7,
        text: "Dambho darpo'bhimānaścha krodhaḥ pāruśyam eva ca"
    },
    
    // Jealousy & Comparison
    {
        adhyay: 3, shloka: 35,
        tags: ['duty', 'comparison', 'ego', 'specialization'],
        category: 'jealousy',
        priority: 8,
        text: 'Śreyān sva-dharmo vigunah para-dharmāt svanushṭhitāt'
    },
    {
        adhyay: 14, shloka: 25,
        tags: ['equanimity', 'detachment', 'comparison'],
        category: 'jealousy',
        priority: 7,
        text: 'Samam ca brahmaṇi brahma-nishṭhaḥ pratiṣṭhitam'
    },
    
    // Attachment & Detachment
    {
        adhyay: 3, shloka: 22,
        tags: ['duty', 'attachment', 'responsibility'],
        category: 'attachment',
        priority: 8,
        text: 'Na me pārthāsti kartavyaṁ trailokye kirñchana kim'
    },
    {
        adhyay: 5, shloka: 10,
        tags: ['detachment', 'ego', 'attachment'],
        category: 'attachment',
        priority: 8,
        text: 'Brahmanyādhāya karmāṇi sangaṁ tyaktvā karoti yaḥ'
    },
    {
        adhyay: 2, shloka: 62,
        tags: ['attachment', 'desire', 'control'],
        category: 'attachment',
        priority: 8,
        text: 'Dhyāyato viṣayān puṁsah sangas teṣv upajāyate'
    },
    
    // Self-Doubt & Belief
    {
        adhyay: 2, shloka: 7,
        tags: ['self-doubt', 'duty', 'courage'],
        category: 'fear',
        priority: 9,
        text: 'Kārpaṇya-doṣopahata-svabhāvasya pṛchhāmi tvānaṁ dharma-sammūḍha-chetaḥ'
    },
    {
        adhyay: 18, shloka: 78,
        tags: ['belief', 'faith', 'knowledge'],
        category: 'depression',
        priority: 7,
        text: 'Yatra yogeśvara kṛṣṇo yatra pārtho dhanur-dharah'
    },
    
    // Action & Inaction
    {
        adhyay: 3, shloka: 8,
        tags: ['duty', 'action', 'karma'],
        category: 'duty-conflict',
        priority: 8,
        text: 'Niyataṁ kuru karma tvaṁ karma jyāyo hy akarmanah'
    },
    {
        adhyay: 2, shloka: 40,
        tags: ['focus', 'action', 'clarity'],
        category: 'duty-conflict',
        priority: 7,
        text: "Nehābhikrama-nāśo'sti pratyavāyo na vidyate"
    },
    
    // Knowledge & Wisdom
    {
        adhyay: 4, shloka: 37,
        tags: ['knowledge', 'transformation', 'wisdom'],
        category: 'general',
        priority: 8,
        text: 'Jñānāgnih sarva-karmāṇi bhasmasāt kurute arjuna'
    },
    {
        adhyay: 10, shloka: 11,
        tags: ['knowledge', 'wisdom', 'enlightenment'],
        category: 'general',
        priority: 7,
        text: 'Teṣām ēvānukampārthaṁ aham ajñāna-jaṁ tamaḥ'
    },
    
    // Devotion & Surrender
    {
        adhyay: 12, shloka: 6,
        tags: ['devotion', 'surrender', 'faith'],
        category: 'general',
        priority: 8,
        text: 'Ye tu sarvāṇi karmāṇi mayi sannyasya mat-paraḥ'
    },
    {
        adhyay: 12, shloka: 5,
        tags: ['devotion', 'focus', 'discipline'],
        category: 'general',
        priority: 7,
        text: "Kleśo'dhikataras teṣām avyaktāsakta-cetasām"
    },
    
    // Strength & Power
    {
        adhyay: 2, shloka: 40,
        tags: ['focus', 'action', 'clarity'],
        category: 'duty-conflict',
        priority: 7,
        text: "Nehābhikrama-nāśo'sti pratyavāyo na vidyate"
    },
    {
        adhyay: 15, shloka: 1,
        tags: ['knowledge', 'strength', 'truth'],
        category: 'general',
        priority: 7,
        text: 'Ūrdhva-mūlam adaḥ-śākhyam aśvatthaṁ prāhur avyayam'
    },
    
    // Hope & Inspiration
    {
        adhyay: 11, shloka: 33,
        tags: ['hope', 'destiny', 'duty'],
        category: 'depression',
        priority: 8,
        text: 'Tasmāt tvam uttiṣṭha yaśo labhasva jitvā śatrūn bhunksva rājayaṁ samṛddham'
    },
    {
        adhyay: 13, shloka: 7,
        tags: ['knowledge', 'truth', 'wisdom'],
        category: 'general',
        priority: 7,
        text: 'Amānitvam adambhitvam ahiṁsā kṣāntir ārjavam'
    }
];

async function seedVerses() {
    try {
        console.log('🌱 Starting verse database seeding...');
        await connectDb();
        
        // Clear existing tagged verses (optional)
        // await Shloka.deleteMany({});
        
        let created = 0;
        let updated = 0;
        
        for (const verseData of TAGGED_VERSES) {
            const query = {
                adhyay: verseData.adhyay,
                shloka: verseData.shloka
            };
            
            const updateData = {
                ...verseData,
                updatedAt: new Date()
            };
            
            const result = await Shloka.findOneAndUpdate(
                query,
                updateData,
                { upsert: true, new: true }
            );
            
            if (result.isNew) {
                created++;
            } else {
                updated++;
            }
            
            console.log(`✅ ${result.adhyay}.${result.shloka} - Tags: ${result.tags.join(', ')}`);
        }
        
        console.log(`\n🎉 Seeding complete!`);
        console.log(`📊 Statistics:`);
        console.log(`   - Created: ${created}`);
        console.log(`   - Updated: ${updated}`);
        console.log(`   - Total: ${TAGGED_VERSES.length}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    seedVerses();
}

module.exports = { seedVerses, TAGGED_VERSES };
