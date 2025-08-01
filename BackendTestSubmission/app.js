const express = require('express');
const crypto = require('crypto');
const { Log } = require('./login.js'); // Your existing middleware

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// In-memory storage for URLs and analytics
const urlDatabase = new Map();
const analyticsDatabase = new Map();

// Utility function to generate unique shortcode
function generateShortcode(customCode = null) {
  if (customCode) {
    // Validate custom shortcode
    if (!/^[a-zA-Z0-9]+$/.test(customCode) || customCode.length < 3 || customCode.length > 20) {
      throw new Error('Invalid custom shortcode. Must be alphanumeric, 3-20 characters');
    }
    if (urlDatabase.has(customCode)) {
      throw new Error('Custom shortcode already exists');
    }
    return customCode;
  }
  
  // Generate random shortcode
  let shortcode;
  do {
    shortcode = crypto.randomBytes(4).toString('hex').substring(0, 6);
  } while (urlDatabase.has(shortcode));
  
  return shortcode;
}

// Utility function to validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// API Endpoints

// 1. Create Short URL
app.post('/shorturls', async (req, res) => {
  try {
    await Log('BACKEND', 'INFO', 'urlshortener', 'Creating short URL request received');
    
    const { url, validity, shortcode } = req.body;
    
    // Validate required fields
    if (!url) {
      await Log('BACKEND', 'ERROR', 'urlshortener', 'URL field is required');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL field is required'
      });
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
      await Log('BACKEND', 'ERROR', 'urlshortener', 'Invalid URL format provided');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format'
      });
    }
    
    // Set validity (default 30 minutes)
    const validityMinutes = validity && Number.isInteger(validity) && validity > 0 ? validity : 30;
    const expiryTime = new Date(Date.now() + validityMinutes * 60 * 1000);
    
    // Generate or validate shortcode
    let generatedShortcode;
    try {
      generatedShortcode = generateShortcode(shortcode);
    } catch (error) {
      await Log('BACKEND', 'ERROR', 'urlshortener', `Shortcode generation failed: ${error.message}`);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
    
    // Store URL data
    const urlData = {
      originalUrl: url,
      shortcode: generatedShortcode,
      createdAt: new Date(),
      expiryTime: expiryTime,
      clickCount: 0
    };
    
    urlDatabase.set(generatedShortcode, urlData);
    
    // Initialize analytics for this shortcode
    analyticsDatabase.set(generatedShortcode, {
      totalClicks: 0,
      clicks: [],
      originalUrl: url,
      createdAt: urlData.createdAt,
      expiryTime: expiryTime
    });
    
    const shortLink = `http://hostname:port/${generatedShortcode}`;
    
    await Log('BACKEND', 'INFO', 'urlshortener', `Short URL created successfully: ${shortLink}`);
    
    res.status(201).json({
      shortLink: shortLink,
      expiry: expiryTime.toISOString()
    });
    
  } catch (error) {
    await Log('BACKEND', 'ERROR', 'urlshortener', `Unexpected error: ${error.message}`);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// 2. Redirect to Original URL
app.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    await Log('BACKEND', 'INFO', 'urlshortener', `Redirect request for shortcode: ${shortcode}`);
    
    // Check if shortcode exists
    const urlData = urlDatabase.get(shortcode);
    if (!urlData) {
      await Log('BACKEND', 'WARN', 'urlshortener', `Shortcode not found: ${shortcode}`);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Shortcode not found'
      });
    }
    
    // Check if link has expired
    if (new Date() > urlData.expiryTime) {
      await Log('BACKEND', 'WARN', 'urlshortener', `Expired shortcode accessed: ${shortcode}`);
      return res.status(410).json({
        error: 'Gone',
        message: 'Short link has expired'
      });
    }
    
    // Record click analytics
    const clickData = {
      timestamp: new Date(),
      userAgent: req.get('User-Agent') || 'Unknown',
      referrer: req.get('Referrer') || 'Direct',
      ip: req.ip || req.connection.remoteAddress || 'Unknown'
    };
    
    // Update analytics
    const analytics = analyticsDatabase.get(shortcode);
    analytics.totalClicks++;
    analytics.clicks.push(clickData);
    
    // Update URL click count
    urlData.clickCount++;
    
    await Log('BACKEND', 'INFO', 'urlshortener', `Successful redirect to: ${urlData.originalUrl}`);
    
    // Redirect to original URL
    res.redirect(302, urlData.originalUrl);
    
  } catch (error) {
    await Log('BACKEND', 'ERROR', 'urlshortener', `Redirect error: ${error.message}`);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// 3. Retrieve Short URL Statistics
app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    await Log('BACKEND', 'INFO', 'urlshortener', `Statistics request for shortcode: ${shortcode}`);
    
    // Check if shortcode exists
    const analytics = analyticsDatabase.get(shortcode);
    if (!analytics) {
      await Log('BACKEND', 'WARN', 'urlshortener', `Statistics requested for non-existent shortcode: ${shortcode}`);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Shortcode not found'
      });
    }
    
    // Prepare detailed click data
    const detailedClicks = analytics.clicks.map(click => ({
      timestamp: click.timestamp.toISOString(),
      source: click.referrer,
      userAgent: click.userAgent,
      location: 'Unknown' // Geographic location would require IP geolocation service
    }));
    
    const statisticsResponse = {
      totalClicks: analytics.totalClicks,
      originalUrl: analytics.originalUrl,
      createdAt: analytics.createdAt.toISOString(),
      expiryDate: analytics.expiryTime.toISOString(),
      clicks: detailedClicks
    };
    
    await Log('BACKEND', 'INFO', 'urlshortener', `Statistics retrieved for shortcode: ${shortcode}`);
    
    res.json(statisticsResponse);
    
  } catch (error) {
    await Log('BACKEND', 'ERROR', 'urlshortener', `Statistics error: ${error.message}`);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  await Log('BACKEND', 'INFO', 'urlshortener', 'Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'URL Shortener Microservice'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  Log('BACKEND', 'ERROR', 'urlshortener', `Unhandled error: ${error.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// Handle 404 for unmatched routes
app.use('*', async (req, res) => {
  await Log('BACKEND', 'WARN', 'urlshortener', `404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found'
  });
});

// Cleanup expired URLs periodically (every 5 minutes)
setInterval(async () => {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [shortcode, urlData] of urlDatabase.entries()) {
    if (now > urlData.expiryTime) {
      urlDatabase.delete(shortcode);
      analyticsDatabase.delete(shortcode);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    await Log('BACKEND', 'INFO', 'urlshortener', `Cleaned up ${cleanedCount} expired URLs`);
  }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, async () => {
  await Log('BACKEND', 'INFO', 'urlshortener', `Server started on port ${PORT}`);
  console.log(`URL Shortener Microservice running on port ${PORT}`);
});

module.exports = app;