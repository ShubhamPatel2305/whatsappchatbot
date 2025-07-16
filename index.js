const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const { sendButtonMessage, sendChatbotMessage, sendAICallerMessage, sendBookDemoMessage } = require('./utils/Step1handlers');
const { sendLeaveConfirmationAndMenu, sendPromptForTimeSlots, sendPartialConfirmationAndMenu } = require('./utils/step2');
const { sendAdminInitialButtons, sendAdminLeaveDateList } = require('./utils/Step1');
const { parseDateFromId } = require('./utils/helpers');
const connectDB = require('./db');
const { DoctorScheduleOverride } = require('./models/DoctorScheduleOverride');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let isWaitingForTimeSlot = false;
let waitingForPartial   = false;
let partialDate         = '';

// Load knowledge base for OpenAI
const knowledgeBase = fs.readFileSync(require('path').join(__dirname, 'utils', 'knowledgeBase.txt'), 'utf8');

// In-memory state store for user sessions (for MVP; replace with Redis/DB for production)
const userSessions = {};

// Helper to get or initialize user session
function getUserSession(userId) {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      step: 'home',
      data: {}
    };
  }
  return userSessions[userId];
}

// Helper to send WhatsApp interactive button message
async function sendWhatsAppButtons({ phoneNumberId, to, header, body, buttons }) {
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
      header: header ? { type: 'text', text: header } : undefined,
      body: { text: body },
      action: {
        buttons: buttons.map(({ id, title }) => ({
          type: 'reply',
          reply: { id, title }
        }))
      }
    }
  };
  // Remove undefined header if not set
  if (!header) delete data.interactive.header;
  try {
    await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error sending WhatsApp buttons:', err.response?.data || err.message);
  }
}

// Helper to send WhatsApp interactive list message (for day selection)
async function sendWhatsAppList({ phoneNumberId, to, header, body, button, rows }) {
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
      header: header ? { type: 'text', text: header } : undefined,
      body: { text: body },
      footer: { text: '' },
      action: {
        button,
        sections: [
          {
            title: 'Available Days',
            rows
          }
        ]
      }
    }
  };
  if (!header) delete data.interactive.header;
  try {
    await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error sending WhatsApp list:', err.response?.data || err.message);
  }
}

// Helper to send plain WhatsApp text message
async function sendWhatsAppText({ phoneNumberId, to, body }) {
  const apiVersion = process.env.API_VERSION || 'v18.0';
  const token = process.env.WHATSAPP_TOKEN;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const data = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  };
  try {
    await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error sending WhatsApp text:', err.response?.data || err.message);
  }
}

// Utility: Send buttons or list depending on count
async function sendSmartButtonsOrList({ phoneNumberId, to, header, body, buttons, fallbackButtonLabel = 'Select Option' }) {
  if (buttons.length > 3) {
    // Use WhatsApp list message
    await sendWhatsAppList({
      phoneNumberId,
      to,
      header,
      body,
      button: fallbackButtonLabel,
      rows: buttons.map(({ id, title }) => ({ id, title }))
    });
  } else {
    // Use WhatsApp button message
    await sendWhatsAppButtons({
      phoneNumberId,
      to,
      header,
      body,
      buttons
    });
  }
}

// Helper: get available days (Mon-Sat, disable Sun)
function getAvailableDays() {
  return [
    { id: 'day_monday',    title: 'Monday' },
    { id: 'day_tuesday',   title: 'Tuesday' },
    { id: 'day_wednesday', title: 'Wednesday' },
    { id: 'day_thursday',  title: 'Thursday' },
    { id: 'day_friday',    title: 'Friday' },
    { id: 'day_saturday',  title: 'Saturday' }
    // Sunday intentionally omitted
  ];
}

// Helper: get available time slots (static for now, can be dynamic)
function getAvailableTimeSlots(day) {
  // In real app, fetch from DB based on day/overrides
  return [
    { id: 'slot_09_00', title: '9:00 AM' },
    { id: 'slot_10_30', title: '10:30 AM' },
    { id: 'slot_12_00', title: '12:00 PM' },
    { id: 'slot_14_30', title: '2:30 PM' },
    { id: 'slot_16_00', title: '4:00 PM' }
  ];
}

// Main user chatbot flow handler
async function handleUserChatbotFlow({ from, phoneNumberId, messages, res }) {
  const session = getUserSession(from);
  const userMsgType = messages.type;
  const userMsg = userMsgType === 'interactive' ? (messages.interactive?.button_reply?.id || messages.interactive?.list_reply?.id) : messages.text?.body;

  // AI-powered free-text handling (not a button/list reply)
  if (userMsgType === 'text' && (!session.step || session.step === 'home' || session.step === 'home_waiting' || session.step === 'faq_menu' || session.step === 'appt_day' || session.step === 'appt_pick_day_waiting' || session.step === 'appt_time_waiting')) {
    // Compose OpenAI prompt
    const prompt = `You are Ava, a helpful assistant for CODE CLINIC. Use the following knowledge base to answer user questions. Always be friendly, concise, and use new lines for clarity. If the answer is not in the knowledge base, follow the fallback instructions.\n\n[KNOWLEDGE BASE]\n${knowledgeBase}\n\n[USER]: ${userMsg}\n[ASSISTANT]:`;
    let aiResponse = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are Ava, a helpful assistant for CODE CLINIC.' },
          { role: 'user', content: prompt }
        ]
      });
      aiResponse = completion.choices[0].message.content.trim();
    } catch (err) {
      aiResponse = "Sorry, I'm having trouble accessing my knowledge base right now. Please try again later or use the buttons below.";
    }
    // Always append the two main buttons
    await sendSmartButtonsOrList({
      phoneNumberId,
      to: from,
      header: undefined,
      body: aiResponse,
      buttons: [
        { id: 'user_schedule_appt', title: 'Book Appointment' },
        { id: 'user_ask_question', title: 'Ask a Question' }
      ]
    });
    session.step = 'home_waiting';
    res.status(200).end();
    return;
  }

  // Allow restart at any point
  if (userMsg === 'user_home' || userMsg === 'faq_home') {
    session.step = 'home';
    await handleUserChatbotFlow({ from, phoneNumberId, messages: { type: 'trigger' }, res });
    return;
  }

  // Home menu (step: 'home')
  if (session.step === 'home') {
    await sendSmartButtonsOrList({
      phoneNumberId,
      to: from,
      header: 'Hi there! 👋',
      body: 'Welcome to CODE CLINIC – where your smile matters 😊\n\nHow can I help you today?',
      buttons: [
        { id: 'user_schedule_appt', title: 'Schedule Appointment' },
        { id: 'user_ask_question', title: 'Ask a Question' }
      ]
    });
    session.step = 'home_waiting';
    res.status(200).end();
    return;
  }

  // Home menu response
  if (session.step === 'home_waiting') {
    if (userMsg === 'user_schedule_appt') {
      // Go to appointment flow step 1
      await sendSmartButtonsOrList({
        phoneNumberId,
        to: from,
        header: 'Let’s find a time!',
        body: 'Awesome! Let’s find a time that works best for you.\nWhen would you like to come in?',
        buttons: [
          { id: 'appt_today', title: 'Today' },
          { id: 'appt_tomorrow', title: 'Tomorrow' },
          { id: 'appt_pick_day', title: 'Pick a Day' }
        ]
      });
      session.step = 'appt_day';
      res.status(200).end();
      return;
    } else if (userMsg === 'user_ask_question') {
      // Go to FAQ flow step 1 (use list message for more than 3 options)
      await sendSmartButtonsOrList({
        phoneNumberId,
        to: from,
        header: 'Happy to help!',
        body: 'What would you like to know?',
        buttons: [
          { id: 'faq_hours', title: 'Clinic Hours' },
          { id: 'faq_payment', title: 'Payment & Insurance' },
          { id: 'faq_services', title: 'Services We Offer' },
          { id: 'faq_human', title: 'Talk to a Human' },
          { id: 'faq_home', title: 'Back to Start' }
        ]
      });
      session.step = 'faq_menu';
      res.status(200).end();
      return;
    } else {
      // Fallback for unexpected input (max 3 buttons)
      await sendSmartButtonsOrList({
        phoneNumberId,
        to: from,
        header: 'Oops! I didn’t catch that 🙈',
        body: 'Please use the buttons below so I can guide you better:',
        buttons: [
          { id: 'user_schedule_appt', title: 'Book Appointment' },
          { id: 'user_ask_question', title: 'Ask a Question' },
          { id: 'user_home', title: 'Start Over' }
        ]
      });
      session.step = 'home_waiting';
      res.status(200).end();
      return;
    }
  }

  // Appointment: Day selection
  if (session.step === 'appt_day') {
    if (userMsg === 'appt_today' || userMsg === 'appt_tomorrow') {
      // Set day and go to time slot selection
      const today = new Date();
      let chosenDay;
      if (userMsg === 'appt_today') {
        chosenDay = today.toLocaleDateString('en-US', { weekday: 'long' });
      } else {
        today.setDate(today.getDate() + 1);
        chosenDay = today.toLocaleDateString('en-US', { weekday: 'long' });
      }
      session.data.day = chosenDay;
      await sendWhatsAppList({
        phoneNumberId,
        to: from,
        header: 'Pick a time ⏰',
        body: `Great! Here are the available time slots for ${chosenDay}:\nPick a time that suits you ⏰`,
        button: 'Select Time',
        rows: getAvailableTimeSlots(chosenDay).map(slot => ({ id: slot.id, title: slot.title }))
      });
      session.step = 'appt_time_waiting';
      res.status(200).end();
      return;
    } else if (userMsg === 'appt_pick_day') {
      // Show list of days (Mon-Sat)
      await sendWhatsAppList({
        phoneNumberId,
        to: from,
        header: 'Pick a Day',
        body: 'Sure! Choose from the available days:',
        button: 'Select Day',
        rows: getAvailableDays().map(day => ({ id: day.id, title: day.title }))
      });
      session.step = 'appt_pick_day_waiting';
      res.status(200).end();
      return;
    } else {
      // Fallback
      await sendSmartButtonsOrList({
        phoneNumberId,
        to: from,
        header: 'Oops! I didn’t catch that 🙈',
        body: 'Please use the buttons below so I can guide you better:',
        buttons: [
          { id: 'appt_today', title: 'Today' },
          { id: 'appt_tomorrow', title: 'Tomorrow' },
          { id: 'appt_pick_day', title: 'Pick a Day' },
          { id: 'user_home', title: 'Start Over' }
        ]
      });
      session.step = 'appt_day';
      res.status(200).end();
      return;
    }
  }

  // Appointment: Pick a Day (list reply)
  if (session.step === 'appt_pick_day_waiting') {
    const pickedDay = getAvailableDays().find(day => day.id === userMsg);
    if (pickedDay) {
      session.data.day = pickedDay.title;
      await sendWhatsAppList({
        phoneNumberId,
        to: from,
        header: 'Pick a time ⏰',
        body: `Great! Here are the available time slots for ${pickedDay.title}:\nPick a time that suits you ⏰`,
        button: 'Select Time',
        rows: getAvailableTimeSlots(pickedDay.title).map(slot => ({ id: slot.id, title: slot.title }))
      });
      session.step = 'appt_time_waiting';
      res.status(200).end();
      return;
    } else {
      // Fallback
      await sendWhatsAppList({
        phoneNumberId,
        to: from,
        header: 'Pick a Day',
        body: 'Please select a day from the list:',
        button: 'Select Day',
        rows: getAvailableDays().map(day => ({ id: day.id, title: day.title }))
      });
      session.step = 'appt_pick_day_waiting';
      res.status(200).end();
      return;
    }
  }

  // Appointment: Time slot selection (list reply)
  if (session.step === 'appt_time_waiting') {
    const pickedSlot = getAvailableTimeSlots(session.data.day).find(slot => slot.id === userMsg);
    if (pickedSlot) {
      session.data.time = pickedSlot.title;
      await sendWhatsAppText({
        phoneNumberId,
        to: from,
        body: `Perfect! You’ve chosen\n📅 ${session.data.day}, 🕐 ${pickedSlot.title}\n\nJust a few quick details to lock it in 👇\n\nWhat’s your full name?`
      });
      session.step = 'appt_name';
      res.status(200).end();
      return;
    } else {
      // Fallback
      await sendWhatsAppList({
        phoneNumberId,
        to: from,
        header: 'Pick a time ⏰',
        body: `Please pick a time slot for ${session.data.day}:`,
        button: 'Select Time',
        rows: getAvailableTimeSlots(session.data.day).map(slot => ({ id: slot.id, title: slot.title }))
      });
      session.step = 'appt_time_waiting';
      res.status(200).end();
      return;
    }
  }

  // Appointment: Collect name (free text)
  if (session.step === 'appt_name') {
    if (userMsgType === 'text' && userMsg && userMsg.length > 1) {
      session.data.name = userMsg;
      await sendWhatsAppText({
        phoneNumberId,
        to: from,
        body: `Thanks, ${userMsg}! 😊\nAnd what’s the best number we can reach you at?`
      });
      session.step = 'appt_phone';
      res.status(200).end();
      return;
    } else {
      await sendWhatsAppText({
        phoneNumberId,
        to: from,
        body: `Please type your full name to continue.`
      });
      session.step = 'appt_name';
      res.status(200).end();
      return;
    }
  }

  // Appointment: Collect phone (free text, basic validation)
  if (session.step === 'appt_phone') {
    if (userMsgType === 'text' && userMsg && /^\d{10,}$/.test(userMsg.replace(/\D/g, ''))) {
      session.data.phone = userMsg;
      // Save appointment to DB here if needed
      await sendWhatsAppButtons({
        phoneNumberId,
        to: from,
        header: 'Got it 👍',
        body: `✅ Your appointment request for ${session.data.day} at ${session.data.time} is noted.\nWe’ll confirm it shortly on WhatsApp or by phone.\n\nNeed anything else?`,
        buttons: [
          { id: 'user_ask_question', title: 'Ask Another Question' },
          { id: 'user_home', title: 'Start Over' }
        ]
      });
      session.step = 'home_waiting';
      res.status(200).end();
      return;
    } else {
      await sendWhatsAppText({
        phoneNumberId,
        to: from,
        body: `Please enter a valid phone number (digits only).`
      });
      session.step = 'appt_phone';
      res.status(200).end();
      return;
    }
  }

  // FAQ menu (now using list reply)
  if (session.step === 'faq_menu') {
    if ([
      'faq_hours',
      'faq_payment',
      'faq_services',
      'faq_human',
      'faq_home'
    ].includes(userMsg)) {
      // Respond to each FAQ option with a valid button set (max 3)
      if (userMsg === 'faq_hours') {
        await sendSmartButtonsOrList({
          phoneNumberId,
          to: from,
          header: 'Clinic Hours',
          body: '⏰ Our clinic is open:\nMonday to Saturday: 10:00 AM – 6:00 PM\nSunday: Closed\n\nNeed help with something else?',
          buttons: [
            { id: 'user_schedule_appt', title: 'Book Appointment' },
            { id: 'user_ask_question', title: 'Ask Another Question' },
            { id: 'user_home', title: 'Go Home' }
          ]
        });
      } else if (userMsg === 'faq_payment') {
        await sendSmartButtonsOrList({
          phoneNumberId,
          to: from,
          header: 'Payment & Insurance',
          body: 'We accept most major payment methods:\n💳 Cards, 💵 Cash, UPI, and insurance from select providers.\n\nWant more info?',
          buttons: [
            { id: 'user_schedule_appt', title: 'Book Appointment' },
            { id: 'user_ask_question', title: 'Ask Another Question' },
            { id: 'user_home', title: 'Go Home' }
          ]
        });
      } else if (userMsg === 'faq_services') {
        await sendSmartButtonsOrList({
          phoneNumberId,
          to: from,
          header: 'Services We Offer',
          body: 'We offer a wide range of dental and medical services.\nFor details, visit our website or ask for a specific service!\n\nNeed help with something else?',
          buttons: [
            { id: 'user_schedule_appt', title: 'Book Appointment' },
            { id: 'user_ask_question', title: 'Ask Another Question' },
            { id: 'user_home', title: 'Go Home' }
          ]
        });
      } else if (userMsg === 'faq_human') {
        await sendSmartButtonsOrList({
          phoneNumberId,
          to: from,
          header: 'Talk to a Human',
          body: 'Sure! I’ve noted your request.\n👨‍⚕ One of our team members will reach out to you shortly.\n\nIn the meantime, you can:',
          buttons: [
            { id: 'user_schedule_appt', title: 'Book Appointment' },
            { id: 'user_ask_question', title: 'Ask Another Question' },
            { id: 'user_home', title: 'Go Home' }
          ]
        });
      } else if (userMsg === 'faq_home') {
        session.step = 'home';
        await handleUserChatbotFlow({ from, phoneNumberId, messages: { type: 'trigger' }, res });
        return;
      }
      session.step = 'faq_menu';
      res.status(200).end();
      return;
    } else {
      // Fallback for unexpected input in FAQ (use list again)
      await sendSmartButtonsOrList({
        phoneNumberId,
        to: from,
        header: 'Oops! I didn’t catch that 🙈',
        body: 'Please use the options below so I can guide you better:',
        buttons: [
          { id: 'faq_hours', title: 'Clinic Hours' },
          { id: 'faq_payment', title: 'Payment & Insurance' },
          { id: 'faq_services', title: 'Services We Offer' },
          { id: 'faq_human', title: 'Talk to a Human' },
          { id: 'faq_home', title: 'Back to Start' }
        ]
      });
      session.step = 'faq_menu';
      res.status(200).end();
      return;
    }
  }

  // Fallback for any other unexpected input
  await sendSmartButtonsOrList({
    phoneNumberId,
    to: from,
    header: 'Oops! I didn’t catch that 🙈',
    body: 'Please use the buttons below so I can guide you better:',
    buttons: [
      { id: 'user_schedule_appt', title: 'Book Appointment' },
      { id: 'user_ask_question', title: 'Ask a Question' },
      { id: 'user_home', title: 'Start Over' }
    ]
  });
  session.step = 'home_waiting';
  res.status(200).end();
  return;
}

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

  try {
    const entry = req.body.entry && req.body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const phoneNumberId = value && value.metadata && value.metadata.phone_number_id;
    const messages = value && value.messages && value.messages[0];
    const from = messages && messages.from;

    // Only process if this is a real user message
    if (!messages || !from) {
      // Not a user message (could be a status update, etc)
      return res.status(200).end();
    }

    // Log which handler is being called
    if (from === "916355411808") {
      console.log('Admin logic triggered for', from);
      if (messages?.type === 'interactive') {
        const itf = messages.interactive;
        if (itf?.type === 'button_reply') {
          const buttonId = itf?.button_reply?.id;
          if (buttonId === '01_set_full_day_leave') {
            await sendAdminLeaveDateList({ phoneNumberId, to: messages.from, isFullDayLeave: true });
          } else if (buttonId === '01_set_partial_leave') {
            await sendAdminLeaveDateList({ phoneNumberId, to: messages.from, isFullDayLeave: false });
          }
        }else if (itf?.type === 'list_reply') {
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
            // 1) parse date
            partialDate = parseDateFromId(selectedId, '02partial');
            // 2) ask for free‑form availability
            await sendPromptForTimeSlots({ phoneNumberId, to: from, date: partialDate });
            // 3) set state
            waitingForPartial = true;
          }
        }
      } else {

        if (waitingForPartial && messages.type === 'text') {
          const userText = messages.text.body;
          // 1) build OpenAI prompt
          const prompt = `
            You are a time slot parser. Your job is to extract availability time ranges from a user's message and return them in a strict JSON format.
            Only respond with a valid JSON array of objects. Each object must have a start and end field in 24-hour format (HH:mm), no seconds.
            Do not include any text or explanation. Only return the array.
            
            Example input: I am available from 9am to 11am and again from 3pm to 6pm.
            Output:
            [
              { "start": "09:00", "end": "11:00" },
              { "start": "15:00", "end": "18:00" }
            ]
            
            Now extract from this input:
            "${userText}"
                    `.trim();
          try {
            // 2) call OpenAI
            const resp = await openai.chat.completions.create({
              model:       'gpt-3.5-turbo',
              temperature: 0,
              messages: [{ role: 'user', content: prompt }]
            });
            const jsonString = resp.choices[0].message.content;
            const timeSlots = JSON.parse(jsonString);
  
            // 3) save to Mongo
            await DoctorScheduleOverride.create({
              date:      partialDate,
              type:      'custom_time',
              timeSlots
            });
  
            // 4) confirm back + menu
            await sendPartialConfirmationAndMenu({
              phoneNumberId, to: from,
              date: partialDate, timeSlots
            });
          } catch (err) {
            console.error('Error parsing/saving partial slots:', err);
            // optionally send error message
          } finally {
            // reset state
            waitingForPartial   = false;
            partialDate         = '';
          }
        }
        else if (!waitingForPartial) {
          // …your initial admin buttons…
          await sendAdminInitialButtons({ phoneNumberId, to: messages.from });
        }
      }
    
      return res.sendStatus(200);
    } else {
      console.log('User logic (CODE CLINIC flow) triggered for', from);
      await handleUserChatbotFlow({ from, phoneNumberId, messages, res });
      return;
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
