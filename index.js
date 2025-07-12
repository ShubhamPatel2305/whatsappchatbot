const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Homepage endpoint
app.get('/homepage', (req, res) => {
  res.status(200).json({
    message: 'Hello World',
    status: 'success'
  });
});



const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});


// Whatsapp webhook that it hits when we send message to the bot
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Extract necessary data from webhook payload
  try {
    const entry = req.body.entry && req.body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const phoneNumberId = value && value.metadata && value.metadata.phone_number_id;
    const messages = value && value.messages && value.messages[0];
    const from = messages && messages.from;
    if(messages?.type === 'interactive'){
        if (phoneNumberId && messages.from) {
            if(messages?.interactive?.type === 'button_reply'){
                if(messages?.interactive?.button_reply?.id === '01bookdemo'){
                    await sendBookDemoMessage({ phoneNumberId, to: messages.from });
                }else if(messages?.interactive?.button_reply?.id === '01chatbot'){
                    await sendChatbotMessage({ phoneNumberId, to: messages.from });
                }else if(messages?.interactive?.button_reply?.id === '01aicaller'){
                    await sendAICallerMessage({ phoneNumberId, to: messages.from });
                }
            }
            // await sendInteractiveListMessage({ phoneNumberId, to: messages.from });
        }
    }else{
        //send non interactive message
        if (phoneNumberId && messages.from) {
            await sendButtonMessage({ phoneNumberId, to: messages.from });
        }
    }

    
  } catch (err) {
    console.error('Error extracting data from webhook payload:', err);
  }

  res.status(200).end();
});

// Function to send an interactive list message (dog breeds)
async function sendInteractiveListMessage({ phoneNumberId, to }) {
    const apiVersion = process.env.API_VERSION || 'v18.0';
    const token = process.env.WHATSAPP_TOKEN;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: 'Dog Breeds List'
        },
        body: {
          text: 'Please select your favorite dog breed from the list below.'
        },
        footer: {
          text: 'Powered by WhatsApp Bot'
        },
        action: {
          button: 'Choose Breed',
          sections: [
            {
              title: 'Popular Breeds',
              rows: [
                {
                  id: 'labrador',
                  title: 'Labrador Retriever',
                  description: 'Friendly, outgoing, and high-spirited companions.'
                },
                {
                  id: 'germanshepherd',
                  title: 'German Shepherd',
                  description: 'Courageous, confident, and smart.'
                },
                {
                  id: 'goldenretriever',
                  title: 'Golden Retriever',
                  description: 'Intelligent, friendly, and devoted.'
                },
                {
                  id: 'bulldog',
                  title: 'Bulldog',
                  description: 'Docile, willful, and friendly.'
                },
                {
                  id: 'beagle',
                  title: 'Beagle',
                  description: 'Curious, friendly, and merry.'
                }
              ]
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
      console.log('Interactive list message sent:', response.data);
    } catch (error) {
      console.error('Error sending interactive list message:', error.response ? error.response.data : error.message);
    }
  }
  
  // Function to send an interactive button message (for non-interactive user messages)
  async function sendButtonMessage({ phoneNumberId, to }) {
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
          text: 'Welcome to TopEdge AI'
        },
        body: {
          text: `Hey 👋 this is Ava from TopEdge AI — super glad you reached out!\n\nWe're helping businesses like yours save hours by automating lead responses, bookings, and customer chats using smart AI tech.\n\nCan I quickly ask what you're looking for today?`
        },
        footer: {
          text: 'Choose an option below:'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: '01bookdemo',
                title: 'Book Demo'
              }
            },
            {
              type: 'reply',
              reply: {
                id: '01chatbot',
                title: 'Chatbot'
              }
            },
            {
              type: 'reply',
              reply: {
                id: '01aicaller',
                title: 'AI Caller'
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
      console.log('Button message sent:', response.data);
    } catch (error) {
      console.error('Error sending button message:', error.response ? error.response.data : error.message);
    }
  }
  
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

// Start server
app.listen(PORT, () => {
  console.log(`WhatsApp Bot server is running on port ${PORT}`);
  console.log(`Homepage endpoint: http://localhost:${PORT}/homepage`);
});

module.exports = app;
