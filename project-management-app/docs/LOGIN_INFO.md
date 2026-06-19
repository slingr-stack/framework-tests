# Tasky app - Login Information

## 🔐 Default Users

The application comes with several pre-configured users for testing different roles and permissions:

**All users use the password:** `password123`

### System Administrator

- **Email:** `admin@projectmanagement.com`
- **Password:** `password123`
- **Role:** System
- **Access:** Full access to all features

### Admin User (Recommended for Testing)

- **Email:** `admin@company.com`
- **Password:** `password123`
- **Role:** Admin
- **Access:** Full access to users, projects, and tasks

### Project Managers

**Manager 1:**

- **Email:** `manager1@company.com`
- **Password:** `password123`
- **Role:** Manager
- **Access:** Can manage projects where they are the manager

**Manager 2:**

- **Email:** `manager2@company.com`
- **Password:** `password123`
- **Role:** Manager

### Developers

**Developer 1:**

- **Email:** `dev1@company.com`
- **Password:** `password123`
- **Role:** Developer
- **Access:** Can view projects they're part of and update their assigned tasks

**Developer 2:**

- **Email:** `dev2@company.com`
- **Password:** `password123`
- **Role:** Developer

**Developer 3:**

- **Email:** `dev3@company.com`
- **Password:** `password123`
- **Role:** Developer

## Cloud Deployment — Default User

When deploying to GCP via `deploy.js`, a default admin user is automatically created:

- **Email:** `sys@app.com`
- **Password:** `123456788`
- **Role:** System (full access)

> **Change this password after your first login.**

## 🚀 How to Login

### Local
1. Navigate to: http://localhost:8000/login
2. Enter one of the emails above
3. Enter password: `password123`
4. Click "Login"

### Cloud (GCP)
1. Navigate to the Frontend URL (LB IP or custom domain)
2. Email: `sys@app.com`
3. Password: `123456788`

## 📋 Features by Role

### System/Admin

- View/Create/Edit/Delete all projects
- View/Create/Edit/Delete all tasks
- View/Create/Edit/Delete all users
- Execute all actions

### Manager

- View all users
- View/Create/Edit/Delete projects they manage
- View/Create/Edit/Delete tasks in their projects
- Assign tasks
- Update project status

### Developer

- View users
- View projects they're part of
- View tasks in their projects
- Update tasks assigned to them
- Start/Complete their own tasks

## 🐛 Troubleshooting

### "Insufficient permissions" error

- You need to log in first
- Go to http://localhost:8000/login
- Use one of the accounts above

### Empty tables even after login

- Check browser console for errors
- Verify you're logged in (should see user avatar in top right)
- Try refreshing the page

### Left menu not visible

- Make sure you're logged in
- The menu only appears for authenticated users
- Menu items: Projects, Tasks, Users
