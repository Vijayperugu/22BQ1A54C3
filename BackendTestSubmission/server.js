
const express = require('express');
const { nanoid } = require('nanoid');
const { Log } = require('./login.js');

const app = express();
const PORT = 3000; 
const HOSTNAME = `http://localhost:${PORT}`;

app.use(express.json()); // To parse JSON request bodies

const urlDatabase = {};

const isValidUrl = (urlString) => {
    try {
        new URL(urlString);
        return true;
    } catch (e) {
        return false;
    }
};

const toISOStringWithMilliseconds = (date) => {
    const pad = (num) => (num < 10 ? '0' : '') + num;
    return date.getUTCFullYear() + '-' +
        pad(date.getUTCMonth() + 1) + '-' +
        pad(date.getUTCDate()) + 'T' +
        pad(date.getUTCHours()) + ':' +
        pad(date.getUTCMinutes()) + ':' +
        pad(date.getUTCSeconds()) + '.' +
        (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
};
app.post('/shorturls', async (req, res) => {
    const { url, validity, shortcode } = req.body;

    // Validate original URL
    if (!url || !isValidUrl(url)) {
        await Log('backend', 'error', 'api', `Invalid URL format received: ${url}`);
        return res.status(400).json({ error: 'A valid `url` is required in the request body.' });
    }

    let finalShortcode = shortcode;

    // Handle custom shortcode
    if (shortcode) {
        if (!/^[a-zA-Z0-9]{4,}$/.test(shortcode)) {
            await Log('backend', 'error', 'api', `Invalid custom shortcode format: ${shortcode}`);
            return res.status(400).json({ error: 'Custom shortcode must be at least 4 alphanumeric characters.' });
        }
        if (urlDatabase[shortcode]) {
            await Log('backend', 'warn', 'api', `Shortcode collision for: ${shortcode}`);
            return res.status(409).json({ error: `Shortcode '${shortcode}' is already in use.` });
        }
    } else {
        // Generate a new unique shortcode
        do {
            finalShortcode = nanoid(7); // Generate a 7-character shortcode
        } while (urlDatabase[finalShortcode]);
    }

    const creationDate = new Date();
    const validityMinutes = parseInt(validity, 10) || 30; // Default to 30 minutes
    const expiryDate = new Date(creationDate.getTime() + validityMinutes * 60 * 1000);

    // Store URL data
    urlDatabase[finalShortcode] = {
        originalUrl: url,
        shortLink: `${HOSTNAME}/${finalShortcode}`,
        creationDate: creationDate,
        expiryDate: expiryDate,
        clicks: 0,
        clickDetails: []
    };

    await Log('backend', 'info', 'api', `URL shortened: ${url} -> ${finalShortcode}`);

    res.status(201).json({
        shortLink: urlDatabase[finalShortcode].shortLink,
        expiry: toISOStringWithMilliseconds(expiryDate)
    });
});
app.get('/shorturls/:shortcode', async (req, res) => {
    const { shortcode } = req.params;
    const record = urlDatabase[shortcode];

    if (!record) {
        await Log('backend', 'warn', 'api', `Statistics requested for non-existent shortcode: ${shortcode}`);
        return res.status(404).json({ error: 'Shortcode not found.' });
    }
    
    await Log('backend', 'info', 'api', `Statistics retrieved for shortcode: ${shortcode}`);

    res.status(200).json({
        totalClicks: record.clicks,
        originalUrl: record.originalUrl,
        creationDate: toISOStringWithMilliseconds(record.creationDate),
        expiryDate: toISOStringWithMilliseconds(record.expiryDate),
        detailedClickData: record.clickDetails
    });
});
app.get('/:shortcode', async (req, res) => {
    const { shortcode } = req.params;
    const record = urlDatabase[shortcode];

    if (!record) {
        await Log('backend', 'error', 'redirect', `Redirect failed: shortcode not found - ${shortcode}`);
        return res.status(404).send('URL not found.');
    }

    if (new Date() > record.expiryDate) {
        await Log('backend', 'warn', 'redirect', `Redirect failed: link expired - ${shortcode}`);
        return res.status(410).send('URL has expired.');
    }
    record.clicks++;
    record.clickDetails.push({
        timestamp: new Date().toISOString(),
        source: req.ip, // Coarse-grained location: IP address
        referrer: req.get('Referrer') || 'Direct'
    });

    await Log('backend', 'info', 'redirect', `Redirecting ${shortcode} to ${record.originalUrl}`);
    res.redirect(302, record.originalUrl);
});

app.listen(PORT, () => {
    console.log(`URL Shortener microservice running at ${HOSTNAME}`);
    Log('backend', 'info', 'system', 'Service started successfully.');
});