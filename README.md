# Travel Ticket Management System

A comprehensive web application for managing travel tickets, tracking profits, and generating reports. Built with React.js frontend and Node.js/Express backend with MongoDB database.

![Travel Ticket Manager](https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop)

## 🚀 Features

### ✈️ Ticket Management
- **Multi-modal Support**: Handle train, bus, and flight tickets
- **Comprehensive Data**: Track amount, profit, passenger details, PNR, fare, refunds, and remarks
- **Real-time Validation**: Form validation with error handling
- **Search & Filter**: Advanced filtering by ticket type and search functionality
- **Sortable Columns**: Sort by date, amount, profit, passenger name, and type

### 📊 Profit Tracking
- **Live Dashboard**: Real-time profit summaries by transport type
- **Visual Analytics**: Color-coded profit cards with icons
- **Total Calculations**: Automatic calculation of total profits across all tickets

### 💰 Payment Management
- **Payment Tracking**: Record payments made every 15 days
- **Payment History**: Complete history with dates and periods
- **Balance Calculation**: Automatic calculation of remaining amounts
- **Payment Reports**: Export payment data to CSV

### 📈 Reporting
- **CSV Export**: Generate detailed reports in CSV format
- **Custom Filename**: Auto-generated filenames with timestamps
- **Comprehensive Data**: All ticket details included in reports

### 🔒 Data Management
- **MongoDB Integration**: Secure cloud database storage
- **Real-time Sync**: Automatic synchronization between frontend and backend
- **Data Persistence**: All data safely stored in MongoDB
- **Error Handling**: Graceful error handling with user feedback

## 🛠️ Technology Stack

### Frontend
- **React.js 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **Vite** - Fast development server

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Development Tools
- **ESLint** - Code linting
- **Concurrently** - Run multiple commands
- **Nodemon** - Auto-restart server
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** database (local or cloud)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd travel-ticket-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string_here

# Server Configuration (optional)
PORT=5050

# Frontend API URL (optional)
VITE_API_URL=http://localhost:5050/api
```

**Important**: Replace `your_mongodb_connection_string_here` with your actual MongoDB connection string.

### 4. MongoDB Setup
You can use either:
- **MongoDB Atlas** (Cloud): Get connection string from [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Local MongoDB**: Use `mongodb://localhost:27017/travel-tickets`

### 5. Start the Application
```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
# Backend only
npm run server

# Frontend only (in another terminal)
npm run dev
```

## 🌐 Application URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5050/api
- **Health Check**: http://localhost:5050/api/health

## 📁 Project Structure

```
travel-ticket-management/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── TicketForm.tsx       # Add new tickets
│   │   ├── TicketTable.tsx      # Display tickets table
│   │   ├── ProfitSummary.tsx    # Profit dashboard
│   │   └── PaymentTracker.tsx   # Payment management
│   ├── hooks/                   # Custom React hooks
│   │   └── useApi.ts           # API integration hooks
│   ├── services/               # API service layer
│   │   └── api.ts             # API client
│   ├── types/                 # TypeScript type definitions
│   │   └── ticket.ts         # Data models
│   ├── utils/                # Utility functions
│   │   └── reportGenerator.ts # CSV export functionality
│   └── App.tsx              # Main application component
├── server/                   # Backend source code
│   ├── models/              # MongoDB models
│   │   ├── Ticket.js       # Ticket schema
│   │   └── Payment.js      # Payment schema
│   ├── routes/             # API routes
│   │   ├── tickets.js     # Ticket endpoints
│   │   └── payments.js    # Payment endpoints
│   └── server.js          # Express server setup
├── .env                   # Environment variables
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🔌 API Endpoints

### Tickets
- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `GET /api/tickets/summary` - Get profit summary

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create new payment
- `DELETE /api/payments/:id` - Delete payment

### Health
- `GET /api/health` - Server health check

## 💡 Usage Guide

### Adding a New Ticket
1. Fill in all required fields in the "Add New Ticket" form
2. Select ticket type (Train/Bus/Flight)
3. Enter passenger details, PNR, amounts, and dates
4. Click "Add Ticket" to save

### Viewing Tickets
- Use the search bar to find specific tickets
- Filter by ticket type using the dropdown
- Click column headers to sort data
- Delete tickets using the trash icon

### Managing Payments
1. Click "Add Payment" in the Payment Tracker section
2. Enter payment date, amount, and period
3. View payment history and remaining balance
4. Export payment reports as needed

### Generating Reports
- Click "Export Report" to download CSV file
- Reports include all ticket details
- Files are automatically named with timestamps

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start frontend development server
npm run server       # Start backend server
npm run dev:full     # Start both frontend and backend
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Adding New Features
1. **Frontend**: Add components in `src/components/`
2. **Backend**: Add routes in `server/routes/`
3. **Database**: Add models in `server/models/`
4. **Types**: Update types in `src/types/`

## 🚨 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```
Error: Unable to connect to the database
```
- Verify your MongoDB connection string in `.env`
- Check if MongoDB service is running
- Ensure network connectivity to MongoDB Atlas

**Port Already in Use**
```
Error: Port 5050 is already in use
```
- Change the PORT in `.env` file
- Kill the process using the port: `lsof -ti:5050 | xargs kill`

**Frontend Can't Connect to Backend**
- Ensure backend server is running on port 5050
- Check CORS configuration in `server/server.js`
- Verify API URL in frontend code

### Environment Variables
Make sure these are set in your `.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=5050
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **MongoDB** for the robust database solution
- **Tailwind CSS** for the utility-first styling
- **Lucide** for the beautiful icons

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation

---

**Built with ❤️ using React.js and MongoDB**
