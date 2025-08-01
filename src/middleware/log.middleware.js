import axios from 'axios';
import dotenv from "dotenv"
dotenv.config();

const baseUrl = process.env.BASE_URL

const token = process.env.TOKEN

const backendPackages = [
  'cache', 'controller', 'cron_job', 'db', 'domain', 
  'handler', 'repository', 'route', 'service'
];

const frontendPackages = [
  'api', 'component', 'hook', 'page', 'state', 'style'
];

const sharedPackages = [
  'auth', 'config', 'middleware', 'utils'
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
    message: message
  };

  await sendLog(payload);
}

async function sendLog(payload) {
  try {
    const response = await axios.post(baseUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      timeout: 5000, // optional: helps detect network issues early
    });

    console.log('Log response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send log:', error.message);
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    }
    throw error;
  }
}


export { Log };