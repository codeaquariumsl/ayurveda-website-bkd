# Siddhaka Ayurveda Backend

A robust Node.js and Express backend for the Siddhaka Ayurveda website, providing API endpoints for user authentication, product management, service packages, and treatment bookings.

## 🚀 Features

- **Authentication**: JWT-based secure authentication for users.
- **Product Management**: APIs to manage Ayurvedic products.
- **Service Packages**: Manage treatment packages and offerings.
- **Booking System**: Handle patient bookings and appointments.
- **Patient Management**: Store and manage patient information.
- **Logging**: Integrated request logging with Morgan for development.
- **Database**: Mongoose models for structured data storage in MongoDB.
- **Data Seeding**: Scripts to import/destroy demo data.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Security**: JWT (JSON Web Tokens), Bcrypt.js
- **Development**: Nodemon, Morgan (Logging)

## 📋 Prerequisites

- Node.js (v20 or higher recommended)
- MongoDB (Local or Atlas)
- npm or yarn

## 🔧 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/codeaquariumsl/ayurveda-website-bkd.git
   cd ayurveda-website-bkd
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```

4. **Seed Data (Optional)**:
   To populate the database with initial sample data:
   ```bash
   npm run data:import
   ```

5. **Run the server**:
   ```bash
   # For production
   npm start

   # For development (with hot-reload and logging)
   npm run dev
   ```

## 🛣️ API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user & get token

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Packages
- `GET /api/packages` - List all service packages
- `GET /api/packages/:id` - Get package details

### Bookings
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings/my-bookings` - Get logged-in user's bookings

## 📁 Project Structure

- `config/`: Database configuration
- `controllers/`: Request handlers and business logic
- `models/`: Mongoose schemas
- `routes/`: API endpoint definitions
- `middleware/`: Authentication and error handling middlewares
- `seeder.js`: Database seeding script

## 📝 License

This project is licensed under the ISC License.
