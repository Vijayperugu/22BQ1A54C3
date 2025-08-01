# URL Shortener Microservice

A Node.js microservice for creating, managing, and analyzing shortened URLs. Includes logging middleware and analytics features.

## Features
- Create short URLs with custom or auto-generated codes
- Redirect to original URLs
- Track click analytics and statistics
- Set expiry for short URLs
- Health check endpoint
- Logging middleware for all major events

## Endpoints
### 1. Create Short URL
- **POST** `/shorturls`
- **Body:** `{ url: string, validity?: number, shortcode?: string }`
- **Response:** `{ shortLink: string, expiry: string }`

### 2. Redirect to Original URL
- **GET** `/:shortcode`
- Redirects to the original URL if valid and not expired

### 3. Retrieve Short URL Statistics
- **GET** `/shorturls/:shortcode`
- **Response:** `{ totalClicks, originalUrl, createdAt, expiryDate, clicks: [...] }`

### 4. Health Check
- **GET** `/health`
- **Response:** `{ status, timestamp, service }`

## Setup
1. Clone the repository
2. Run `npm install` to install dependencies
3. Start the server: `node BackendTestSubmission/app.js`

## Configuration
- The server runs on port `3000` by default
- Logging is sent to the evaluation service using a JWT token (update in `login.js`)

## Project Structure
- `BackendTestSubmission/app.js` - Main server file
- `BackendTestSubmission/login.js` - Logging middleware
- Other files for routes, helpers, and analytics

## License
MIT
