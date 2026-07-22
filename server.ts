import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to format server time in Jakarta WIB timezone
function getServerTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateString = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(now);

  return {
    serverTimeIso: now.toISOString(),
    epochMs: now.getTime(),
    date: dateString,
    time: timeString,
    formatted: `${dateString} ${timeString} WIB`,
  };
}

// REST API Endpoints

// 1. Anti-Tamper Server Time endpoint
app.get('/api/server-time', (req, res) => {
  res.json(getServerTime());
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Sistem Absensi Karyawan PWA',
    serverTime: getServerTime(),
  });
});

// Haversine distance calculator helper on server
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 2. Attendance Auto-Verification API
app.post('/api/verify-attendance', (req, res) => {
  const {
    userLat,
    userLng,
    officeLat,
    officeLng,
    officeRadiusMeters,
    faceMatchScore,
    workStartTime,
    lateToleranceMinutes,
    type, // 'masuk' or 'pulang'
  } = req.body;

  const st = getServerTime();
  const distance = calculateDistanceMeters(userLat, userLng, officeLat, officeLng);
  const isWithinGeofence = distance <= officeRadiusMeters;
  const isFaceVerified = (faceMatchScore || 0) >= 65;

  let isSuccess = isWithinGeofence && isFaceVerified;
  let remarksList: string[] = [];

  if (!isWithinGeofence) {
    remarksList.push(`Gagal: Lokasi di luar radius kantor (${distance}m > ${officeRadiusMeters}m)`);
  }

  if (!isFaceVerified) {
    remarksList.push(`Gagal: Wajah tidak cocok dengan data pendaftaran (${faceMatchScore}% < 65%)`);
  }

  if (isSuccess) {
    if (type === 'masuk') {
      const [startH, startM] = (workStartTime || '08:00').split(':').map(Number);
      const [currH, currM] = st.time.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const currMinutes = currH * 60 + currM;
      const lateDiff = currMinutes - startMinutes;

      if (lateDiff > (lateToleranceMinutes || 15)) {
        remarksList.push(`Terlambat ${lateDiff} menit`);
      } else {
        remarksList.push('Tepat Waktu');
      }
    } else {
      remarksList.push('Absen Pulang Normal');
    }
  }

  res.json({
    status: isSuccess ? 'berhasil' : 'gagal',
    distanceFromOfficeMeters: distance,
    isWithinGeofence,
    isFaceVerified,
    serverTime: st.time,
    serverDate: st.date,
    keterangan: remarksList.join(' | ') || 'Verifikasi Berhasil',
  });
});

async function setupServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sistem Absensi Karyawan Server active on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
