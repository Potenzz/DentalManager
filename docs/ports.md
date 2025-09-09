# 🛰️ Development Hosts & Ports

This document defines the default **host** and **port** used by each app/service
in this turborepo.  
Update this file whenever a new service is added or port is changed.

---

## 🌐 Frontend (React + Vite)
- **Host:** `localhost` (default)  
  - Use `0.0.0.0` if you need LAN access (phone/other device on same Wi-Fi).  
- **Port:** `3000`  
- **Access URLs:**
  - Local: [http://localhost:3000](http://localhost:3000)
  - LAN: `http://<your-ip>:3000` (only if HOST=0.0.0.0)


**Current setup:**  
Frontend is running on `0.0.0.0` and is accessible via the device IP.

**`.env` file:**
```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
VITE_API_BASE_URL_BACKEND=http://192.168.1.8:5000
```

Based on backend HOST and PORT. Currently Backend runs on 0.0.0.0 so its accessible all over the same network.
Change the Backend url if needed, 

And, VITE_API_BASE_URL_BACKEND shows the backend url of the network, make localhost if only own device to work with.
Or change accordingly with real IP.

---

## ⚙️ Backend (FastAPI)
- **Host:** `localhost`  
- **Port:** `5000`  
- **Access URL:** [http://localhost:5000](http://localhost:5000)


**Current setup:**  
Currently runs for all network, and allow given frontend urls. Change accordingly.


**`.env` file:**
```env
NODE_ENV="development"
HOST=0.0.0.0
PORT=5000
FRONTEND_URLS=http://localhost:3000,http://192.168.1.8:3000
```

---

## 🧾 Patient Data Extractor Service
- **Host:** `localhost`  
- **Port:** `5001`  
- **Access URL:** [http://localhost:5001](http://localhost:5001)


## 💳 Selenium Service
- **Host:** `localhost`  
- **Port:** `5002`  
- **Access URL:** [http://localhost:5002](http://localhost:5002)


## 💳 Payment OCR Service
- **Host:** `localhost`  
- **Port:** `5003`  
- **Access URL:** [http://localhost:5003](http://localhost:5003)

---

## 📖 Notes
- These values come from per-app `.env` files:
  - `HOST` controls binding (`localhost` = loopback only, `0.0.0.0` = all interfaces).  
  - `PORT` controls the service’s port.  
- Frontend uses additional variables prefixed with `VITE_` for client-side access (e.g. `VITE_API_BASE_URL_BACKEND`).  
- In production, ports and hosts may differ (configured by deployment platform).  

---

✅ **Action for developers:**  
1. Copy `.env.example` → `.env` inside each app folder.  
2. Adjust `HOST` / `PORT` if your ports are already taken.  
3. Run `npm run dev` from the repo root.  
