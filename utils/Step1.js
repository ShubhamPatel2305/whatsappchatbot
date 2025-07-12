const axios = require('axios');

async function sendAdminLeaveDateList({ phoneNumberId, to, isFullDayLeave }) {
  const apiVersion = process.env.API_VERSION || 'v18.0';
  const token = process.env.WHATSAPP_TOKEN;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function getDateRows() {
    const rows = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDate();
      const month = d.toLocaleString('default', { month: 'long' });
      const year = d.getFullYear();
      const title = `${getOrdinal(day)} ${month} ${year}`;
      const idPrefix = isFullDayLeave ? '02full' : '02partial';
      const id = `${idPrefix}${day.toString().padStart(2, '0')}${(d.getMonth() + 1).toString().padStart(2, '0')}${year}`;
      rows.push({
        id,
        title,
        description: 'Tap to select this date'
      });
    }
    return rows;
  }

  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: isFullDayLeave
          ? 'Set Full Day Leave 🗓️'
          : 'Set Partial Day Availability ⏱️'
      },
      body: {
        text: isFullDayLeave
          ? 'Please select the date you want to mark as a full-day leave.'
          : 'Please select the date you want to mark with partial availability (custom time slots).'
      },
      footer: {
        text: 'Pick a date from the list below.'
      },
      action: {
        button: 'Select Date',
        sections: [
          {
            title: 'Available Dates',
            rows: getDateRows()
          }
        ]
      }
    }
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Leave list message sent:', response.data);
  } catch (error) {
    console.error(
      'Error sending leave list message:',
      error.response ? error.response.data : error.message
    );
  }
}

async function sendAdminInitialButtons({ phoneNumberId, to }) {
    const apiVersion = process.env.API_VERSION || 'v18.0';
    const token = process.env.WHATSAPP_TOKEN;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: 'Hello Steven! 👋'
        },
        body: {
          text: 'Welcome to CODE CLINIC Admin Portal\nHow can I help you today?'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: '01_set_full_day_leave',
                title: 'Set Full day Leave'
              }
            },
            {
              type: 'reply',
              reply: {
                id: '01_set_partial_leave',
                title: 'Set Partial Leave'
              }
            }
          ]
        }
      }
    };
  
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Admin button message sent:', response.data);
    } catch (error) {
      console.error(
        'Error sending admin button message:',
        error.response ? error.response.data : error.message
      );
    }
}

module.exports = {
  sendAdminLeaveDateList,
  sendAdminInitialButtons
};