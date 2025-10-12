# Nextcloud Registration for IWI Students

React + TypeScript registration system for HKA IWI Nextcloud with RZ authentication.

## Setup

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
node server.js
```

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3000
NEXTCLOUD_URL=https://your-nextcloud-url
NEXTCLOUD_ADMIN_USER=admin
NEXTCLOUD_ADMIN_PASSWORD=password
RAUMZEIT_URL=https://raumzeit.iwi-hka.de
NODE_ENV=development
```

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## API Endpoints

- `POST /api/auth` - Authenticate with RZ credentials
- `POST /api/nextcloud/user` - Create Nextcloud user
- `GET /health` - Health check

## Features

- Privacy consent page (GDPR compliant)
- RZ authentication via Raumzeit API
- IWI student verification
- Nextcloud user creation
- File logging (`backend/logs/latest.log`)

## Tech Stack

- React 18 + TypeScript + Vite
- Express.js + Axios
- Purple/lavender color scheme
