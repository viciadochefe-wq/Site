// Serverless function for creating Stripe checkout sessions (no Appwrite)
import Stripe from 'stripe';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export default async function handler(req, res) {
  // Add CORS headers for Vercel
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtain Stripe secret key from Wasabi metadata
    let stripeSecretKey = '';

    const wasabiAccessKey = process.env.WASABI_ACCESS_KEY;
    const wasabiSecretKey = process.env.WASABI_SECRET_KEY;
    const wasabiRegion = process.env.WASABI_REGION;
    const wasabiBucket = process.env.WASABI_BUCKET;
    const wasabiEndpoint = process.env.WASABI_ENDPOINT; // e.g. https://s3.eu-central-2.wasabisys.com

    if (!wasabiAccessKey || !wasabiSecretKey || !wasabiRegion || !wasabiBucket || !wasabiEndpoint) {
      return res.status(500).json({ error: 'Wasabi credentials are not configured in environment variables' });
    }

    try {
      const s3Client = new S3Client({
        region: wasabiRegion,
        endpoint: wasabiEndpoint,
        credentials: {
          accessKeyId: wasabiAccessKey,
          secretAccessKey: wasabiSecretKey,
        },
        forcePathStyle: true,
      });

      const getConfigObject = new GetObjectCommand({
        Bucket: wasabiBucket,
        Key: 'metadata/videosplus-data.json',
      });

      const obj = await s3Client.send(getConfigObject);
      const text = await obj.Body.transformToString();
      const metadataJson = JSON.parse(text);
      stripeSecretKey = metadataJson?.siteConfig?.stripeSecretKey || '';
    } catch (wasabiError) {
      console.error('Failed to load metadata from Wasabi:', wasabiError);
    }

    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    const stripe = new Stripe(stripeSecretKey);
    const { amount, currency = 'usd', name, success_url, cancel_url } = req.body;
    
    if (!amount || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create a random product name from a list
    const productNames = [
      "Personal Development Ebook",
      "Financial Freedom Ebook",
      "Digital Marketing Guide",
      "Health & Wellness Ebook",
      "Productivity Masterclass",
      "Mindfulness & Meditation Guide",
      "Entrepreneurship Blueprint",
      "Wellness Program",
      "Success Coaching",
      "Executive Mentoring",
      "Learning Resources",
      "Online Course Access",
      "Premium Content Subscription",
      "Digital Asset Package"
    ];
    
    const randomProductName = productNames[Math.floor(Math.random() * productNames.length)];
    
    let paymentMethodTypes = ['card'];
    if (currency.toLowerCase() === 'eur') {
      try {
        const account = await stripe.accounts.retrieve();
        if (account.capabilities && account.capabilities.sepa_debit_payments === 'active') {
          paymentMethodTypes.push('sepa_debit');
        }
      } catch (_err) {}
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: randomProductName },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url,
      cancel_url,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}