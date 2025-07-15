# WhatsApp Bot Backend (CODE CLINIC)

## Overview
This is a Node.js/Express backend for a WhatsApp chatbot for CODE CLINIC, supporting appointment scheduling, FAQs, and admin leave management.

---

## Deployment on Render

### 1. Prerequisites
- Push your code to a GitHub repository.
- Have a MongoDB database URI ready.
- WhatsApp API credentials (token, phone number ID, etc).
- OpenAI API key (for time slot parsing).

### 2. Render Setup
1. **Create a new Web Service** on [Render](https://dashboard.render.com/).
2. **Connect your GitHub repo** with this code.
3. **Root Directory:** `whatsappchatbot`
4. **Build Command:** *(leave blank, not needed)*
5. **Start Command:**
   ```
   npm start
   ```
6. **Environment Variables:**
   - `MONGODB_URI` (your MongoDB connection string)
   - `WHATSAPP_TOKEN` (your WhatsApp API token)
   - `API_VERSION` (optional, default: v18.0)
   - `OPENAI_API_KEY` (your OpenAI API key)
   - `VERIFY_TOKEN` (for webhook verification)

   *(Render sets `PORT` automatically)*

7. **Deploy!**

---

## Local Development

```bash
cd whatsappchatbot
npm install
npm run dev
```

---

## Endpoints
- `POST /` — WhatsApp webhook endpoint
- `GET /homepage` — Health check

---

## Notes
- All user and admin flows are handled in `index.js`.
- For any issues, check logs in the Render dashboard. 