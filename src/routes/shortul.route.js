import express from 'express';
import {
  createShortUrl,
  redirectShortUrl,
  getStats
} from '../controllers/shorturl.controller.js';

const router = express.Router();

router.post('/shorturls', createShortUrl);

router.get('/shorturls/:shortcode', getStats);

router.get('/:shortcode', redirectShortUrl);

export default router;
