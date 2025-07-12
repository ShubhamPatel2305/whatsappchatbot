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

module.exports = {
    sendLeaveConfirmationAndMenu
  };
