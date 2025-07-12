const express = require('express');
const dotenv = require('dotenv');

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

// Root endpoint for basic health check
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'WhatsApp Bot API is running',
    status: 'success',
    endpoints: {
      homepage: '/homepage'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`WhatsApp Bot server is running on port ${PORT}`);
  console.log(`Homepage endpoint: http://localhost:${PORT}/homepage`);
});

module.exports = app;
