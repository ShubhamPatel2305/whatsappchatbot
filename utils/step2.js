const axios = require('axios');

async function sendLeaveConfirmationAndMenu({ phoneNumberId, to, date }) {
  const apiVersion = process.env.API_VERSION || 'v18.0';
  const token      = process.env.WHATSAPP_TOKEN;
  const url        = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const data = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: `✅ Leave marked for ${date}` },
      body:  { text: 'How can I help you further?' },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id:    '01_set_full_day_leave',
              title: 'Set Full day Leave'
            }
          },
          {
            type: 'reply',
            reply: {
              id:    '01_set_partial_leave',
              title: 'Set Partial Leave'
            }
          }
        ]
      }
    }
  };

  try {
    await axios.post(url, data, {
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error sending leave confirmation:', err.response?.data || err.message);
  }
}
async function sendPromptForTimeSlots({ phoneNumberId, to, date }) {
  const apiVersion = process.env.API_VERSION || 'v18.0';
  const token      = process.env.WHATSAPP_TOKEN;
  const url        = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const text = 
    `Please enter your availability timings for *${date}* in free‑form. ` +
    `You can write in your own words. Examples:\n` +
    `1. I will be available from 12:00 to 14:00\n` +
    `2. I will be available from 12:00 to 14:00 and from 16:00 to 18:00`;

  const data = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };

  try {
    await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error sending time-slot prompt:', err.response?.data || err.message);
  }
}
async function sendPartialConfirmationAndMenu({ phoneNumberId, to, date, timeSlots }) {
  const apiVersion = process.env.API_VERSION || 'v18.0';
  const token      = process.env.WHATSAPP_TOKEN;
  const url        = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const slotsText = timeSlots
    .map(ts => `• ${ts.start} – ${ts.end}`)
    .join('\n');

  const data = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: `✅ Availability set for ${date}` },
      body:  { text: `Your time slots:\n${slotsText}` },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: '01_set_full_day_leave',   title: 'Set Full day Leave' }
          },
          {
            type: 'reply',
            reply: { id: '01_set_partial_leave',    title: 'Set Partial Leave' }
          }
        ]
      }
    }
  };

  try {
    await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error sending partial confirm:', err.response?.data || err.message);
  }
}

module.exports = {
    sendLeaveConfirmationAndMenu,
    sendPromptForTimeSlots,
    sendPartialConfirmationAndMenu
  };
