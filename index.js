const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const { sendButtonMessage, sendChatbotMessage, sendAICallerMessage, sendBookDemoMessage } = require('./utils/Step1handlers');
const { sendAdminInitialButtons, sendAdminLeaveDateList } = require('./utils/Step1');
const { parseDateFromId } = require('./utils/helpers');
const connectDB = require('./db');
const { DoctorScheduleOverride } = require('./models/DoctorScheduleOverride');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let isWaitingForTimeSlot = false;

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
    if (from === "916355411809") {
      if (messages?.type === 'interactive') {
        const itf = messages.interactive;
        if (itf?.type === 'button_reply') {
          const buttonId = itf?.button_reply?.id;
          if (buttonId === '01_set_full_day_leave') {
            await sendAdminLeaveDateList({ phoneNumberId, to: messages.from, isFullDayLeave: true });
          } else if (buttonId === '01_set_partial_leave') {
            await sendAdminLeaveDateList({ phoneNumberId, to: messages.from, isFullDayLeave: false });
          }
        }else if (interactiveType === 'list_reply') {
          const selectedId = itf?.list_reply?.id;
      
          if (selectedId.startsWith('02full')) {
            // Full day leave selected for specific date
            const date = parseDateFromId(selectedId, '02full');

            try {
              // Save to MongoDB
              await DoctorScheduleOverride.create({ date, type: 'leave' });
              // Confirm and show menu again
              await sendLeaveConfirmationAndMenu({ phoneNumberId, to: from, date });
            } catch (err) {
              console.error('DB save error:', err);
              // you might send an error message here
            }
      
            // Call logic to save full day leave in DB for that date
          } else if (selectedId.startsWith('02partial')) {
            // Partial leave selected for specific date
            const date = parseDateFromId(selectedId, '02partial');
            console.log('Admin selected partial availability for:', date);
      
            // You can now ask for time slots in next message
          }
        }
      } else {
        if (!isWaitingForTimeSlot) {
          await sendAdminInitialButtons({ phoneNumberId, to: messages.from });
          isWaitingForTimeSlot = true;
        } else {
          // Optional: handle when already waiting (future logic)
        }
      }
    
      return res.sendStatus(200);
    }else if(messages?.type === 'interactive'){
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
  
console.log(`Starting server on port ${PORT}...`);
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed", err);
    process.exit(1);
  });

module.exports = app;
