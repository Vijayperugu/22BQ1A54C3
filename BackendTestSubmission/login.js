

const axios = require('axios');

const baseUrl = 'http://28.244.56.144/evaluation-service/logs'
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJwdmlqYXkyMDA0ODEwQGdtYWlsLmNvbSIsImV4cCI6MTc1NDAzMTEwNywiaWF0IjoxNzU0MDMwMjA3LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiZDhlOWE3ODUtMDBhNy00ZTllLThiYjEtNmJkNTVjM2JlN2E1IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicGVydWd1IHZpamF5Iiwic3ViIjoiZGJhNzhjZjMtZGNmMy00MGU2LWE3ZWItNjcxOGM0ZjUwZGRjIn0sImVtYWlsIjoicHZpamF5MjAwNDgxMEBnbWFpbC5jb20iLCJuYW1lIjoicGVydWd1IHZpamF5Iiwicm9sbE5vIjoiMjJicTFhNTRjMyIsImFjY2Vzc0NvZGUiOiJQblZCRlYiLCJjbGllbnRJRCI6ImRiYTc4Y2YzLWRjZjMtNDBlNi1hN2ViLTY3MThjNGY1MGRkYyIsImNsaWVudFNlY3JldCI6InBieGFTWFB1cVVTWnlIU0gifQ.6OaZWCBHVr6SPbh_0F1fjO6HtHD1esz9SwkEborXuZw"

const backendPackages = [
  'cache', 'controller', 'cron_job', 'db', 'domain', 
  'handler', 'repository', 'route', 'service'
];

const frontendPackages = [
  'api', 'component', 'hook', 'page', 'state', 'style'
];

const sharedPackages = [
  'auth', 'config', 'middleware', 'utils', 'system'
];



const Log = async (stack, level, pkg, message) => {
  if (!['backend', 'frontend'].includes(stack?.toLowerCase())) {
    console.warn(`Invalid stack: ${stack}. Must be 'backend' or 'frontend'`);
    return;
  }

  if (!['debug', 'info', 'warn', 'error', 'fatal'].includes(level?.toLowerCase())) {
    console.warn(`Invalid level: ${level}. Must be one of: debug, info, warn, error, fatal`);
    return;
  }

  const validPackages = stack?.toLowerCase() === 'backend' 
    ? [...backendPackages, ...sharedPackages]
    : [...frontendPackages, ...sharedPackages];

  if (!validPackages.includes(pkg?.toLowerCase())) {
    console.warn(`Invalid package: ${pkg} for stack: ${stack}`);
    return;
  }

  const payload = {
    stack: stack.toLowerCase(),
    level: level.toLowerCase(),
    package: pkg.toLowerCase(),
    message: message.trim()
  };

  await sendLog(payload);
}

async function sendLog(payload) {
  try {
    const response = await axios.post(baseUrl, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Increased timeout to 15 seconds
    });
    console.log('Log response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Failed to send log:', error.response.data);
    } else {
      console.error('Failed to send log:', error.message);
    }
    throw error;
  }
}

module.exports = { Log };