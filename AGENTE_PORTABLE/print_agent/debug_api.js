const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
console.log(`Checking Key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING'}`);

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("AVAILABLE MODELS:");
                json.models.forEach(m => console.log(m.name));
            } else {
                console.log("No models found in response:", data.substring(0, 200));
            }
        } catch (e) {
            console.log('Body:', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
