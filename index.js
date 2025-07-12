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

// Route for POST requests
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

    if (phoneNumberId && from) {
      await sendInteractiveListMessage({ phoneNumberId, to: from });
    }
  } catch (err) {
    console.error('Error extracting data from webhook payload:', err);
  }

  res.status(200).end();
});




// Start server
app.listen(PORT, () => {
  console.log(`WhatsApp Bot server is running on port ${PORT}`);
  console.log(`Homepage endpoint: http://localhost:${PORT}/homepage`);
});

module.exports = app;
