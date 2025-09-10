# Lakshmi Travels Operations Dashboard

Unified internal dashboard for managing travel tickets, accounts/payments, refunds, vehicles & fuel/service logs, and exporting period/account reports. Frontend: React + TypeScript + Vite + Tailwind. Backend: Express + MongoDB (Mongoose). Auth via session cookie (JWT) with optional Auth0 integration.

![Travel Ticket Manager](https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop)

## 🚀 Core Features

### Tickets & Accounts
- Train / Bus / Flight support with passenger names, PNR, service (booking account), route/place, booking amount (base), ticket amount (booking + profit), profit auto‑derived, refund details, remarks.
- Open vs Paid segregation: Dashboard shows only open (unpaid) tickets; Payment Tracker shows paid tickets.
- Bulk mark-as-paid (by selection) with per-account preview.
- Sticky totals row (open & paid tables) with aggregated Ticket Amount, Booking Amount, Refund, Profit.
- Always-visible Profit column (profit = Ticket Amount – Booking Amount; refund does NOT reduce profit).
- Duplicate PNR warning (non-blocking) when creating tickets.

### Payments
- Payment History aggregates derived from linked tickets (Amount Received = Ticket Amount – Refund; does not trust manual payment amount field for per-ticket settlement logic).
- Per-payment computed: ticket sum, refund sum, profit sum (again using ticketAmount-bookingAmount), count.
- Account breakdown scopes: All / Open / Paid with dynamic due calculation.

### Vehicles & Fuel / Service
- Multi-vehicle (car/bike) management with metadata (model, manufacturer month-year, buy date, capacity, notes, active flag).
- Refueling & Service entries unified; mileage automatically computed from previous vs current odometer with distance & km/l display.
- Stacked monthly bar chart (fuel vs service cost by vehicle type).

### Reporting & Export
- PDF ticket report (first page header only, page numbers, red text for refunded tickets).
- CSV export (integer-only formatting) with totals & due rows.
- All currency values integer-rounded for consistency across UI, PDF, CSV.

### Auth & Security
- Session cookie (JWT) auth wrapper; optional Auth0 OAuth code flow.
- Protected API routes (`/api/tickets`, `/api/payments`, `/api/fuel`, `/api/vehicles`).
- CORS configured for local dev + configurable client origin.

### UI / UX Enhancements
- Responsive tables with resizable Place column, passenger name wrapping.
- Color-coded row states (refunds highlighted), gradient headers, sticky footers.
- Accessible keyboard & screen-reader friendly form labels.

### Removed / Deprecated
- Legacy ProfitSummary aggregate endpoint & component (profit now derived client-side consistently).
- Obsolete FuelTracker component replaced by VehicleDashboard.

## 🛠️ Technology Stack

### Frontend
- React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- jsPDF + autotable (on-demand dynamic import) & html2canvas for PDF/print exports

### Backend
- Express 5, Mongoose 8 (MongoDB)
- JWT session cookie + optional Auth0 OAuth
- Bcrypt for password fallback auth

### Tooling
- ESLint (flat config), TypeScript, Tailwind JIT, PostCSS Autoprefixer
- Nodemon for backend dev

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

### 5. Start the Application (Dev)
```bash
# Install root deps (frontend)
npm install

# Install server deps
cd server && npm install && cd ..

# Start backend
cd server && npm run dev &

# In another terminal start frontend (root)
npm run dev
```

## 🌐 Local URLs

- Frontend: http://localhost:5173
- API Base: http://localhost:5050/api
- Health: http://localhost:5050/api/health

## 📁 Project Structure

```
travel-ticket-management/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── TicketForm.tsx        # Create / edit tickets (with duplicate PNR warning)
│   │   ├── TicketTable.tsx       # Open / Paid tables with sticky totals
│   │   ├── VehicleDashboard.tsx  # Vehicles & fuel/service tracking + charts
│   │   └── PaymentTracker.tsx    # Payment history & account breakdown
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
GET /api/tickets – list tickets
POST /api/tickets – create ticket
PUT /api/tickets/:id – update ticket / refund
PUT /api/tickets/:id/refund – process refund
DELETE /api/tickets/:id – delete ticket

### Payments
GET /api/payments – list payments
POST /api/payments – create payment (tickets array may be empty initially)
DELETE /api/payments/:id – delete payment

### Vehicles & Fuel
GET /api/vehicles, POST /api/vehicles, PUT /api/vehicles/:id, DELETE /api/vehicles/:id?mode=soft|hard
GET /api/fuel, POST /api/fuel, PUT /api/fuel/:id, DELETE /api/fuel/:id

### Auth / Misc
GET /api/auth/me – current session
POST /api/auth/login – local credential login
POST /api/auth/logout – clear session
GET /api/health – server health

## 💡 Usage Guide

### Workflow Highlights
1. Create tickets (profit auto-updates when you edit booking or ticket amounts).
2. Monitor open tickets on Dashboard; export filtered PDF/CSV per date range & account.
3. Bulk mark selected open tickets as paid; view them in Payment Tracker.
4. Record payments and analyze Amount Received vs Ticket Amount & Refund.
5. Manage vehicles and add refueling/service entries; review mileage & cost trends.
6. Use duplicate PNR warning to avoid accidental duplicates (still allowed when intentional).

## 🔧 Development

### Available Scripts
```bash
npm run dev       # Frontend dev server
npm run build     # Production build (frontend)
npm run lint      # Lint
npm run preview   # Preview dist build
cd server && npm run dev  # Backend dev (from server folder)
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

- React, Vite, Tailwind, Lucide, Mongoose
- jsPDF & autotable for export utilities

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation

---

**Built with ❤️ for internal operations efficiency**
