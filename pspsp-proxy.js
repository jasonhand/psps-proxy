require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());

const PETFINDER_API_KEY = process.env.PETFINDER_API_KEY;
const PETFINDER_API_SECRET = process.env.PETFINDER_API_SECRET;

let accessToken = '';

// Function to get an access token
function getAccessToken() {
    return new Promise((resolve, reject) => {
        request.post({
            url: 'https://api.petfinder.com/v2/oauth2/token',
            form: {
                grant_type: 'client_credentials',
                client_id: PETFINDER_API_KEY,
                client_secret: PETFINDER_API_SECRET
            }
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                const data = JSON.parse(body);
                accessToken = data.access_token;
                resolve();
            } else {
                reject(error || new Error(`Error getting access token: ${response.statusCode}`));
            }
        });
    });
}

// Middleware to ensure access token is set
app.use(async (req, res, next) => {
    if (!accessToken) {
        try {
            await getAccessToken();
            next();
        } catch (error) {
            res.status(500).send('Error obtaining access token');
        }
    } else {
        next();
    }
});

// Proxy endpoint
app.use('/api', (req, res) => {
    const url = `https://api.petfinder.com${req.url}`;
    const headers = {
        'Authorization': `Bearer ${accessToken}`
    };

    request({ url: url, headers: headers })
        .on('error', err => {
            console.error('Request error:', err);
            res.status(500).send('Internal Server Error');
        })
        .pipe(res)
        .on('error', err => {
            // This error handler catches errors in the response stream
            console.error('Response stream error:', err);
        });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

