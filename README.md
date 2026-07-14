# Hostel Complaint Management System

This is a web-based system designed to manage complaints from hostel students. It provides separate interfaces for students to submit and track their complaints, and for administrators to view, manage, and generate reports on these complaints.

## Features

**Student Panel:**
- User registration and login
- Submit new complaints with title, category, description, and priority
- Track the status of submitted complaints
- View detailed information about each complaint, including admin responses

**Admin Panel:**
- Admin login
- Dashboard with an overview of complaint statistics (total, pending, in progress, resolved, rejected)
- View all complaints with filtering options by status, category, and search by student name/matric number
- Manage individual complaints: update status, add admin response
- Generate and export reports for complaints within a specified date range

## Technologies Used

**Backend:**
- Node.js
- Express.js (for API routes)
- `better-sqlite3` (for SQLite database interaction)
- `bcrypt` (for password hashing)
- `jsonwebtoken` (for authentication)
- `dotenv` (for environment variables)

**Frontend:**
- HTML5
- CSS3 (custom styling)
- JavaScript (for dynamic content and API interaction)
- Font Awesome (for icons)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/hostel-complaint-system.git
    cd hostel-complaint-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add the following:
    ```
    PORT=3000
    JWT_SECRET=your_jwt_secret_key_here
    ```
    Replace `your_jwt_secret_key_here` with a strong, random string.

4.  **Run the application:**
    ```bash
    npm start
    ```
    The server will start on the specified PORT (default: 3000).

5.  **Access the application:**
    Open your web browser and navigate to `http://localhost:3000`.

## Default Admin Account

A default admin account is seeded into the database upon initialization:

-   **Email:** `admin@hostel.com`
-   **Password:** `admin123`
-   **Full Name:** `Hostel Admin`
-   **Matric Number:** `ADMIN001`
-   **Room Number:** `OFFICE`
-   **Role:** `admin`

## Project Structure

```
hostel-complaint-system/
├── .env
├── package.json
├── package-lock.json
├── public/
│   ├── admin/
│   │   ├── complaints.html
│   │   ├── dashboard.html
│   │   └── reports.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   └── student.js
│   ├── student/
│   │   ├── dashboard.html
│   │   ├── submit.html
│   │   └── track.html
│   ├── index.html        (Login Page)
│   └── register.html     (Registration Page)
└── server/
    ├── db.js             (Database connection and schema)
    ├── server.js         (Express server setup)
    ├── middleware/
    │   └── auth.js       (JWT authentication middleware)
    └── routes/
        ├── admin.js      (Admin API routes)
        ├── auth.js       (Authentication API routes)
        └── complaints.js (Complaint API routes)