# Finance Tracker

A monorepo project consisting of a React/Vite Client and an Express/Prisma Server.

## Project Structure
- **client**: Frontend application (React + Vite)
- **server**: Backend API (Express + Prisma + PostgreSQL)

## Setup & Run

### 1. Install Dependencies
Run the following command from the root directory to install dependencies for root, client, and server:
```bash
npm run install:all
```

### 2. Environment Configuration (Server)
Navigate to the `server` directory, create the `.env` file, and update your database credentials:
```bash
cd server
cp .env.template .env
```
> **Note:** Ensure you have a PostgreSQL database named `finance_tracker` running. Update the `DATABASE_URL` in `.env` if your credentials differ from the default.

### 3. Database Setup
Initialize the Prisma Client and push the schema to your database. Run these commands inside the `server` directory:
```bash
# Inside /server directory
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
Return to the root directory and start the project. This command runs both the client (port 5173) and server (port 4000) concurrently:
```bash
# Inside root directory
npm run dev
```

## URLs
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:4000](http://localhost:4000)
