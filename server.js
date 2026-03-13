const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const morgan = require('morgan');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Notification Configuration
app.locals.notifications = {
  enableSMS: process.env.ENABLE_SMS !== 'false',
  enableEmail: process.env.ENABLE_EMAIL !== 'false'
};

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  app.use((req, res, next) => {
    if (req.query && Object.keys(req.query).length > 0) {
      console.log('Query Params:', req.query);
    }
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      console.log('Request Body:', req.body);
    }
    next();
  });
}

const path = require('path');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/packages', require('./routes/packageRoutes'));
app.use('/api/treatments', require('./routes/treatmentRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
