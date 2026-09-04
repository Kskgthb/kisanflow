const https = require('https');
const db = require('../config/database');

/**
 * Universal SMS Service
 * Supports Fast2SMS, Twilio, and Database Notification Records
 */
async function sendSMS({ to, message, farmerId }) {
  const cleanPhone = String(to).replace(/[^0-9]/g, '').slice(-10);
  console.log(`\n================= 📱 SENDING SMS =================`);
  console.log(`TO: +91 ${cleanPhone}`);
  console.log(`MESSAGE:\n${message}`);
  console.log(`=================================================\n`);

  // 1. Save notification to Database
  try {
    if (farmerId) {
      await db.query(
        `INSERT INTO notifications (farmer_id, type, message) VALUES ($1, 'SMS', $2)`,
        [farmerId, message]
      );
    }
  } catch (dbErr) {
    console.error('Error saving SMS notification to database:', dbErr.message);
  }

  // 2. Fast2SMS Integration
  if (process.env.FAST2SMS_API_KEY) {
    try {
      // Clean non-ascii/emojis because Indian telecom gateways reject emojis in English routes
      const cleanMsg = message
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/\n+/g, ' ')
        .trim();

      const result = await sendFast2SMS(cleanPhone, cleanMsg, process.env.FAST2SMS_API_KEY);
      console.log('✅ Fast2SMS Response:', result);
      return { success: true, provider: 'Fast2SMS', result };
    } catch (err) {
      console.error('❌ Fast2SMS failed:', err.message);
    }
  }

  // 3. Twilio Integration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const result = await sendTwilioSMS(`+91${cleanPhone}`, message);
      console.log('✅ Twilio Response:', result);
      return { success: true, provider: 'Twilio', result };
    } catch (err) {
      console.error('❌ Twilio failed:', err.message);
    }
  }

  return { success: true, provider: 'Simulated (Logged & DB Stored)' };
}

function sendFast2SMS(numbers, message, apiKey) {
  return new Promise((resolve, reject) => {
    const encodedMessage = encodeURIComponent(message);
    const options = {
      hostname: 'www.fast2sms.com',
      port: 443,
      path: `/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodedMessage}&language=english&flash=0&numbers=${encodeURIComponent(numbers)}`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.return) resolve(parsed);
          else reject(new Error(parsed.message || JSON.stringify(parsed)));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function sendTwilioSMS(to, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const postData = new URLSearchParams({
      To: to,
      From: process.env.TWILIO_PHONE_NUMBER,
      Body: body,
    }).toString();

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let respBody = '';
      res.on('data', (d) => (respBody += d));
      res.on('end', () => resolve(respBody));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = {
  sendSMS,
  sendFast2SMS,
};
