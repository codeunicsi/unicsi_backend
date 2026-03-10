// src/middlewares/shopifyWebhookVerify.js
import crypto from 'crypto';

export const verifyShopifyWebhook = (req, res, next) => {
  try {
    // Get the Shopify HMAC signature from headers
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmacHeader) {
      return res.status(401).send('No HMAC signature provided');
    }

    // IMPORTANT: req.body should be a Buffer from express.raw()
    // If it's undefined, something's wrong with middleware order
    if (!req.body) {
      console.error('Request body is undefined. Check middleware order.');
      return res.status(400).send('Request body is empty');
    }

    // Get your shared secret from environment variables
    const sharedSecret = process.env.SHOPIFY_API_SECRET;
    
    if (!sharedSecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      return res.status(500).send('Server configuration error');
    }

    // Create HMAC from the raw request body
    const hmac = crypto.createHmac('sha256', sharedSecret);
    
    // req.body should be a Buffer from express.raw()
    hmac.update(req.body);
    
    const calculatedHmac = hmac.digest('base64');

    // Compare the calculated HMAC with the one from headers
    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader)
    );

    if (!isValid) {
      return res.status(401).send('Invalid HMAC signature');
    }

    // If you need the parsed body for later use, you can parse it now
    // But keep req.rawBody if needed
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
    
    next();
  } catch (error) {
    console.error('Webhook verification error:', error);
    res.status(401).send('Verification failed');
  }
};