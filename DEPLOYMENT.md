# Deployment Guide: Making JumpTake Live

This guide explains how to make your full-stack job board application live on the web so it can be accessed from any device (phones, tablets, and computers) anywhere in the world, or locally on your home Wi-Fi network.

---

## 1. Local Network Testing (Same Wi-Fi)

If you just want to open the website on your phone or another computer in your house without deploying it to the internet:

### Step 1: Find your computer's local IP address
1. Open **Command Prompt** on your computer.
2. Run `ipconfig`.
3. Look for **IPv4 Address** under your active network adapter (e.g., `192.168.1.50`).

### Step 2: Build and run the unified server
To ensure it works reliably across devices without proxy issues:
1. Stop any running server (`Ctrl + C`).
2. Build the React frontend:
   ```bash
   npm run build
   ```
3. Start the Express server:
   ```bash
   npm run server
   ```
4. On your phone or other computer (connected to the same Wi-Fi), open your web browser and go to:
   ```
   http://<your-computer-ip>:5000
   ```
   *(For example: `http://192.168.1.50:5000`)*

---

## 2. Public Internet Deployment (Making it Live)

To make your project accessible to anyone in the world, you need to deploy the backend server and configure a cloud database.

### Step A: Set up a Cloud Database (MongoDB Atlas)
Since your local MongoDB (`127.0.0.1:27017`) is only on your computer, you need a database in the cloud:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a free shared cluster.
3. In the security settings:
   - Create a database user (username and password).
   - Add `0.0.0.0/0` to your IP Access List (allows connections from your hosting provider).
4. Get your connection string (looks like `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/jumptake?retryWrites=true&w=majority`).

### Step B: Deploy to a Cloud Provider (e.g., Render)
[Render](https://render.com/) is a great free hosting provider for Node.js applications.

1. Create a free account on [Render](https://render.com/).
2. Push your project code to a public/private repository on **GitHub**.
3. On Render, click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name**: `jumptake` (or any name you choose)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build` (This installs dependencies and builds the React client)
   - **Start Command**: `npm run server` (This starts the Express server which serves both the API and React client)
6. Add the following **Environment Variables** in the Render settings:
   - `MONGO_URI`: *Your MongoDB Atlas connection string (from Step A)*
   - `GEMINI_API_KEY`: *Your active Gemini API Key*
   - `JWT_SECRET`: *A secure random string (e.g., `my-super-secret-key-123`)*
   - `NODE_ENV`: `production`
7. Click **Deploy Web Service**. Render will build the React app and start the server. It will provide you with a live URL (e.g. `https://jumptake.onrender.com`).

---

## 3. Production Considerations
- **CORS**: The server serves both the React build and the API on the same domain, which resolves cross-origin resource sharing issues naturally.
- **Port Handling**: Render automatically injects the `PORT` environment variable, which your server correctly handles via `process.env.PORT || 5000`.
- **Database Connection**: Always secure your MongoDB Atlas connection string and do not commit it to GitHub (keep it in `.env` locally or as an environment variable in Render).
