const axios = require('axios');

// Function to send an interactive button message (for non-interactive user messages)
// async function sendButtonMessage({ phoneNumberId, to }) {
//   // Disabled: Old TopEdge AI flow. Use CODE CLINIC flow in index.js only.
//   /*
//   const apiVersion = process.env.API_VERSION || 'v18.0';
//   const token = process.env.WHATSAPP_TOKEN;
//   const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

//   const data = {
//     messaging_product: 'whatsapp',
//     recipient_type: 'individual',
//     to,
//     type: 'interactive',
//     interactive: {
//       type: 'button',
//       header: {
//         type: 'text',
//         text: 'Welcome to TopEdge AI'
//       },
//       body: {
//         text: `Hey 👋 this is Ava from TopEdge AI — super glad you reached out!\n\nWe're helping businesses like yours save hours by automating lead responses, bookings, and customer chats using smart AI tech.\n\nCan I quickly ask what you're looking for today?`
//       },
//       footer: {
//         text: 'Choose an option below:'
//       },
//       action: {
//         buttons: [
//           {
//             type: 'reply',
//             reply: {
//               id: '01bookdemo',
//               title: 'Book Demo'
//             }
//           },
//           {
//             type: 'reply',
//             reply: {
//               id: '01chatbot',
//               title: 'Chatbot'
//             }
//           },
//           {
//             type: 'reply',
//             reply: {
//               id: '01aicaller',
//               title: 'AI Caller'
//             }
//           }
//         ]
//       }
//     }
//   };

//   try {
//     const response = await axios.post(url, data, {
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${token}`
//       }
//     });
//     console.log('Button message sent:', response.data);
//   } catch (error) {
//     console.error('Error sending button message:', error.response ? error.response.data : error.message);
//   }
// }

// Function to send a chatbot info button message
async function sendChatbotMessage({ phoneNumberId, to }) {
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
        text: 'Chatbot Features'
      },
      body: {
        text: `Sure! Here's what our chatbot can do:\n👉 Reply instantly to leads from Instagram, Facebook, or your website  \n👉 Collect and qualify leads 24/7 — even while you sleep  \n👉 Book appointments, answer FAQs, and follow up — automatically\n\nWould you like to:`
      },
      footer: {
        text: 'Choose an option below:'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: '02chatbotseeexample',
              title: '🔁 See real example'
            }
          },
          {
            type: 'reply',
            reply: {
              id: '02chatbotwatchvideo',
              title: '▶ Watch short video'
            }
          },
          {
            type: 'reply',
            reply: {
              id: '02chatbottalkexpert',
              title: '📅 Talk to expert'
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
    console.log('Chatbot info button message sent:', response.data);
  } catch (error) {
    console.error('Error sending chatbot info button message:', error.response ? error.response.data : error.message);
  }
}

// Function to send an AI Caller info button message
async function sendAICallerMessage({ phoneNumberId, to }) {
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
        text: 'AI Caller Features'
      },
      body: {
        text: `Discover how our AI Caller can transform your business calls:\n🤖 Make automated outbound calls to leads and customers\n📞 Qualify leads, schedule appointments, and collect feedback\n⏰ Save time and never miss a follow-up — all handled by AI\n\nWhat would you like to do next?`
      },
      footer: {
        text: 'Select an option below to learn more:'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: '02aicallerseeexample',
              title: '🔁 See real example'
            }
          },
          {
            type: 'reply',
            reply: {
              id: '02aicallerwatchvideo',
              title: '▶ Watch short video'
            }
          },
          {
            type: 'reply',
            reply: {
              id: '02aicallertalkexpert',
              title: '📅 Talk to expert'
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
    console.log('AI Caller info button message sent:', response.data);
  } catch (error) {
    console.error('Error sending AI Caller info button message:', error.response ? error.response.data : error.message);
  }
}

// Function to send a book demo list message with dates
async function sendBookDemoMessage({ phoneNumberId, to }) {
  const apiVersion = process.env.API_VERSION || 'v18.0';
  const token = process.env.WHATSAPP_TOKEN;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  // Helper to get ordinal suffix
  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // Helper to format date as "10th July 2025" and id as "02demo10072025"
  function getDateRows() {
    const rows = [];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDate();
      const month = d.toLocaleString('default', { month: 'long' });
      const year = d.getFullYear();
      const title = `${getOrdinal(day)} ${month} ${year}`;
      const id = `02demo${day.toString().padStart(2, '0')}${(d.getMonth()+1).toString().padStart(2, '0')}${year}`;
      rows.push({
        id,
        title,
        description: 'Book your demo for this date'
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
        text: 'Select a date for your demo'
      },
      body: {
        text: 'Choose a convenient date for your personalized demo. We look forward to connecting with you!'
      },
      footer: {
        text: 'You can select any available date below.'
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
    console.log('Book demo list message sent:', response.data);
  } catch (error) {
    console.error('Error sending book demo list message:', error.response ? error.response.data : error.message);
  }
}

module.exports = {
  // sendButtonMessage, // Disabled: Old TopEdge AI flow. Use CODE CLINIC flow in index.js only.
  sendChatbotMessage,
  sendAICallerMessage,
  sendBookDemoMessage
}; 