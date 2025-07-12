const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const { sendButtonMessage, sendChatbotMessage, sendAICallerMessage, sendBookDemoMessage } = require('./utils/Step1handlers');

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
  
// Start server
app.listen(PORT, () => {
  console.log(`WhatsApp Bot server is running on port ${PORT}`);
  console.log(`Homepage endpoint: http://localhost:${PORT}/homepage`);
});

module.exports = app;
