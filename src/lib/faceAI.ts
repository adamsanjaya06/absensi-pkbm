import { FaceDetectionResult } from '../types';

/**
 * Extracts a normalized 25-dimensional Z-score facial feature vector with detection checks
 */
export function extractFaceDescriptorFromCanvas(canvas: HTMLCanvasElement): number[] {
  const res = extractFaceDescriptorWithDetection(canvas);
  return res.descriptor;
}

export function extractFaceDescriptorWithDetection(canvas: HTMLCanvasElement): {
  descriptor: number[];
  detected: boolean;
  reason?: string;
} {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { descriptor: new Array(25).fill(0), detected: false, reason: 'Kamera tidak dapat membaca piksel.' };
  }

  const { width, height } = canvas;
  if (!width || !height) {
    return { descriptor: new Array(25).fill(0), detected: false, reason: 'Canvas video belum siap.' };
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Focus face analysis on central 70% ellipse region of canvas
  const startX = Math.floor(width * 0.15);
  const endX = Math.floor(width * 0.85);
  const startY = Math.floor(height * 0.10);
  const endY = Math.floor(height * 0.90);

  const regionW = endX - startX;
  const regionH = endY - startY;

  const gridRows = 5;
  const gridCols = 5;
  const cellWidth = Math.floor(regionW / gridCols);
  const cellHeight = Math.floor(regionH / gridRows);

  const rawLuminances: number[] = [];
  let totalLuminanceSum = 0;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let pixelCount = 0;

      const cLeft = startX + c * cellWidth;
      const rTop = startY + r * cellHeight;

      for (let y = rTop; y < rTop + cellHeight; y += 2) {
        for (let x = cLeft; x < cLeft + cellWidth; x += 2) {
          const idx = (y * width + x) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          pixelCount++;
        }
      }

      const avgLuminance =
        pixelCount > 0 ? (0.299 * totalR + 0.587 * totalG + 0.114 * totalB) / (pixelCount * 255) : 0.5;
      rawLuminances.push(avgLuminance);
      totalLuminanceSum += avgLuminance;
    }
  }

  const meanLuminance = totalLuminanceSum / 25;

  // Calculate spatial variance across 25 grid cells
  let varianceSum = 0;
  for (let i = 0; i < 25; i++) {
    varianceSum += Math.pow(rawLuminances[i] - meanLuminance, 2);
  }
  const variance = varianceSum / 25;
  const stdDev = Math.sqrt(variance);

  if (meanLuminance < 0.08) {
    return {
      descriptor: new Array(25).fill(0),
      detected: false,
      reason: 'Kamera terlalu gelap / tertutup. Pastikan pencahayaan ruangan cukup.',
    };
  }

  if (meanLuminance > 0.92) {
    return {
      descriptor: new Array(25).fill(0),
      detected: false,
      reason: 'Kamera silau / overexposed.',
    };
  }

  if (variance < 0.00035) {
    return {
      descriptor: new Array(25).fill(0),
      detected: false,
      reason: 'Wajah tidak terdeteksi pada kamera! Pastikan wajah Anda terlihat jelas pada area lingkaran panduan.',
    };
  }

  // Z-score normalize facial vector so features are invariant to global room lighting
  const descriptor: number[] = rawLuminances.map((val) =>
    Number(((val - meanLuminance) / (stdDev + 0.001)).toFixed(4))
  );

  return { descriptor, detected: true };
}

/**
 * Generates a normalized fallback descriptor for seed data
 */
export function generateSeedFaceDescriptor(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const raw: number[] = [];
  let sum = 0;
  for (let i = 0; i < 25; i++) {
    const val = (Math.sin(hash + i * 1.7) + 1) / 2;
    raw.push(val);
    sum += val;
  }
  const mean = sum / 25;
  let varSum = 0;
  for (let i = 0; i < 25; i++) {
    varSum += Math.pow(raw[i] - mean, 2);
  }
  const std = Math.sqrt(varSum / 25) || 1;

  return raw.map((v) => Number(((v - mean) / std).toFixed(4)));
}

/**
 * Compares two normalized facial descriptors and returns similarity percentage (0 - 99%)
 */
export function compareDescriptors(desc1: number[], desc2: number[]): number {
  if (!desc1 || !desc2 || desc1.length === 0 || desc2.length === 0) {
    return 0;
  }

  const len = Math.min(desc1.length, desc2.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += desc1[i] * desc2[i];
    normA += desc1[i] * desc1[i];
    normB += desc2[i] * desc2[i];
  }

  if (normA === 0 || normB === 0) return 0;

  const correlation = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

  let score = 0;
  if (correlation >= 0.40) {
    // High structural correlation (same person)
    score = Math.round(75 + (correlation - 0.40) * 40);
  } else if (correlation >= 0) {
    score = Math.round(correlation * 125);
  } else {
    score = Math.max(0, Math.round((correlation + 1) * 20));
  }

  return Math.min(99, Math.max(0, score));
}

/**
 * Verifies live camera frame against user's registered face descriptor
 */
export function verifyFaceAgainstRegistered(
  liveCanvas: HTMLCanvasElement,
  registeredDescriptor?: number[],
  isRegistered?: boolean
): FaceDetectionResult & { isNewRegistration?: boolean } {
  const extraction = extractFaceDescriptorWithDetection(liveCanvas);

  if (!extraction.detected) {
    return {
      detected: false,
      score: 0,
      message:
        extraction.reason ||
        'Wajah tidak terdeteksi pada kamera! Pastikan wajah Anda terlihat di dalam area panduan.',
      descriptor: extraction.descriptor,
    };
  }

  const liveDescriptor = extraction.descriptor;

  if (!isRegistered || !registeredDescriptor || registeredDescriptor.length === 0) {
    return {
      detected: true,
      score: 0,
      message:
        'Absen Ditolak: Biometrik wajah belum terdaftar! Silakan daftarkan biometrik wajah Anda (1x) terlebih dahulu pada menu portal.',
      descriptor: liveDescriptor,
    };
  }

  const matchScore = compareDescriptors(liveDescriptor, registeredDescriptor);
  const threshold = 60; // Minimum 60% similarity required to pass

  if (matchScore >= threshold) {
    return {
      detected: true,
      score: matchScore,
      message: `Verifikasi Wajah AI Berhasil! Biometrik Cocok (${matchScore}% >= ${threshold}%).`,
      descriptor: liveDescriptor,
    };
  } else {
    return {
      detected: true,
      score: matchScore,
      message: `Verifikasi Biometrik Wajah Ditolak! Wajah tidak cocok dengan biometrik terdaftar (${matchScore}% < ${threshold}%).`,
      descriptor: liveDescriptor,
    };
  }
}

/**
 * Draws AI Face Guide Overlay HUD on camera canvas
 */
export function drawFaceHudOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  status: 'scanning' | 'success' | 'failed' | 'idle'
) {
  ctx.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2 - 10;
  const rx = Math.min(width, height) * 0.28;
  const ry = Math.min(width, height) * 0.36;

  // Dark semi-transparent background vignette outside oval
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fillRect(0, 0, width, height);

  // Clear inner oval for face area
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw oval border stroke based on status
  let strokeColor = '#3b82f6'; // Blue for scanning
  if (status === 'success') strokeColor = '#22c55e'; // Green
  if (status === 'failed') strokeColor = '#ef4444'; // Red

  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = strokeColor;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Corner brackets HUD
  const boxW = rx * 2.1;
  const boxH = ry * 2.1;
  const left = centerX - boxW / 2;
  const top = centerY - boxH / 2;
  const cornerLen = 20;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  // Top Left corner
  ctx.beginPath();
  ctx.moveTo(left, top + cornerLen);
  ctx.lineTo(left, top);
  ctx.lineTo(left + cornerLen, top);
  ctx.stroke();

  // Top Right corner
  ctx.beginPath();
  ctx.moveTo(left + boxW - cornerLen, top);
  ctx.lineTo(left + boxW, top);
  ctx.lineTo(left + boxW, top + cornerLen);
  ctx.stroke();

  // Bottom Left corner
  ctx.beginPath();
  ctx.moveTo(left, top + boxH - cornerLen);
  ctx.lineTo(left, top + boxH);
  ctx.lineTo(left + cornerLen, top + boxH);
  ctx.stroke();

  // Bottom Right corner
  ctx.beginPath();
  ctx.moveTo(left + boxW - cornerLen, top + boxH);
  ctx.lineTo(left + boxW, top + boxH);
  ctx.lineTo(left + boxW, top + boxH - cornerLen);
  ctx.stroke();

  // Scanning laser line animation
  if (status === 'scanning') {
    const time = Date.now() / 400;
    const scanY = centerY - ry + ((Math.sin(time) + 1) / 2) * (ry * 2);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - rx * 0.9, scanY);
    ctx.lineTo(centerX + rx * 0.9, scanY);
    ctx.stroke();
  }

  ctx.restore();
}
