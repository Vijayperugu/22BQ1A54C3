import Url from '../models/url.model.js';
import { generateShortcode } from '../utils/generateShortCode.js';
import { Log } from '../middleware/log.middleware.js';


export async function createShortUrl(req, res) {
  try {
    const { url, validity = 30, shortcode } = req.body;
    const shortCode = shortcode || generateShortcode();

    const exists = await Url.findOne({ shortcode: shortCode });
    if (exists) {
      await Log('backend', 'warn', 'controller', `Shortcode already exists: ${shortCode}`);
      return res.status(400).json({ error: 'Shortcode already exists.' });
    }

    const expiry = new Date(Date.now() + validity * 60 * 1000); // in milliseconds

    const newUrl = await Url.create({ url, shortcode: shortCode, expiry });

    await Log('backend', 'info', 'controller', `Created short URL: ${shortCode} -> ${url}`);

    return res.status(201).json({
      shortLink: `https://${req.headers.host}/${shortCode}`,
      expiry: expiry.toISOString(),
    });
  } catch (err) {
    await Log('backend', 'error', 'controller', `Create URL failed: ${err.message}`);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function redirectShortUrl(req, res) {
  try {
    const { shortcode } = req.params;
    const entry = await Url.findOne({ shortcode });

    if (!entry) {
      await Log('backend', 'warn', 'controller', `Redirect failed. Shortcode not found: ${shortcode}`);
      return res.status(404).json({ error: 'Shortcode not found' });
    }

    if (new Date() > entry.expiry) {
      await Log('backend', 'info', 'controller', `Shortcode expired: ${shortcode}`);
      return res.status(410).json({ error: 'Link expired' });
    }

    entry.clicks.push({
      timestamp: new Date(),
      source: req.headers.referer || null,
      location: req.ip,
    });

    await entry.save();

    await Log('backend', 'info', 'controller', `Redirected shortcode: ${shortcode} to ${entry.url}`);

    return res.redirect(entry.url);
  } catch (err) {
    await Log('backend', 'error', 'controller', `Redirect error: ${err.message}`);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getStats(req, res) {
  try {
    const { shortcode } = req.params;
    const entry = await Url.findOne({ shortcode });

    if (!entry) {
      await Log('backend', 'warn', 'controller', `Stats fetch failed. Shortcode not found: ${shortcode}`);
      return res.status(404).json({ error: 'Shortcode not found' });
    }

    await Log('backend', 'info', 'controller', `Stats retrieved for shortcode: ${shortcode}`);

    return res.status(200).json({
      url: entry.url,
      createdAt: entry.createdAt,
      expiry: entry.expiry,
      clicks: entry.clicks.length,
      interactions: entry.clicks,
    });
  } catch (err) {
    await Log('backend', 'error', 'controller', `Stats fetch error: ${err.message}`);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
