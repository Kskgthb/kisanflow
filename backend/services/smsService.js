const https = require('https');
const db = require('../config/database');

/**
 * Universal SMS Service
 * Supports Twilio, Fast2SMS, and Database Notification Records
 */
async function sendSMS({ to, message, farmerId }) {
  const cleanPhone = String(to).replace(/[^0-9]/g, '').slice(-10);
  const internationalPhone = `+91${cleanPhone}`;

  console.log(`\n================= 📱 SENDING SMS =================`);
  console.log(`TO: ${internationalPhone}`);
  console.log(`MESSAGE:\n${message}`);
  console.log(`=================================================\n`);

  // 1. Save notification record to Database
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

  // 2. Twilio Integration (Primary SMS Gateway)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const result = await sendTwilioSMS(internationalPhone, message);
      console.log('✅ Twilio SMS dispatched successfully:', result);
      return { success: true, provider: 'Twilio', result };
    } catch (err) {
      console.error('❌ Twilio SMS failed:', err.message);
    }
  }

  // 3. Fast2SMS Integration (Indian Gateway Fallback)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const cleanMsg = message
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/\n+/g, ' ')
        .trim();

      const result = await sendFast2SMS(cleanPhone, cleanMsg, process.env.FAST2SMS_API_KEY);
      console.log('✅ Fast2SMS dispatched successfully:', result);
      return { success: true, provider: 'Fast2SMS', result };
    } catch (err) {
      console.error('❌ Fast2SMS failed:', err.message);
    }
  }

  return { 
    success: true, 
    provider: 'Simulated (Logged & DB Stored)',
    phone: internationalPhone,
    message 
  };
}

/**
 * Dispatch Slot Booking Confirmation SMS
 */
async function sendBookingConfirmationSMS({ phone, farmerName, tokenNumber, queuePosition, waitMinutes, centreName, date, slotTime, cropName, quantity, farmerId }) {
  const message = `🌾 KisanFlow Alert: Namaste ${farmerName || 'Kisan'} ji!
Aapka procurement slot safaltapoorvak book ho gaya hai:
📌 Token No: ${tokenNumber}
🔢 Queue Position: #${queuePosition || 1}
⏱️ Est. Wait: ~${waitMinutes || 10} Mins
🏢 Mandi: ${centreName}
🌾 Crop: ${cropName || 'Grain'} (${quantity || '10'} Qtl)
📅 Date: ${date} at ${slotTime}
Dhanyawad, KisanFlow!`;

  return sendSMS({ to: phone, message, farmerId });
}

/**
 * Dispatch 30-Minute Mandi Arrival Reminder SMS
 */
async function sendSlotReminderSMS({ phone, farmerName, tokenNumber, centreName, date, slotTime, minutesLeft = 30, farmerId }) {
  const message = `⏰ KisanFlow Reminder: Namaste ${farmerName || 'Kisan'} ji!
Aapka slot Mandi me agle ${minutesLeft} minute me aane wala hai!
📌 Token No: ${tokenNumber}
🏢 Mandi: ${centreName}
📅 Slot Time: ${slotTime} (${date})
Kripya apne dastawez (Aadhaar, Bank passbook) aur fasal ke saath Mandi Gate par report karein.
Dhanyawad!`;

  return sendSMS({ to: phone, message, farmerId });
}

function sendFast2SMS(numbers, message, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      route: 'q',
      message: message,
      language: 'english',
      flash: 0,
      numbers: numbers,
    });

    const options = {
      hostname: 'www.fast2sms.com',
      port: 443,
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.return) resolve(parsed);
          else reject(new Error(parsed.message ? (Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message) : JSON.stringify(parsed)));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
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
      res.on('end', () => {
        try {
          const parsed = JSON.parse(respBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `Twilio HTTP ${res.statusCode}: ${respBody}`));
          }
        } catch (e) {
          resolve(respBody);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = {
  sendSMS,
  sendBookingConfirmationSMS,
  sendSlotReminderSMS,
  sendFast2SMS,
  sendTwilioSMS,
};

