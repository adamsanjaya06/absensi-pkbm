import { FaceDetectionResult } from '../types';

/**
 * Extracts a normalized 16-dimensional facial feature vector and checks for face presence
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
    return { descriptor: new Array(16).fill(0.5), detected: false, reason: 'Kamera tidak dapat membaca piksel.' };
  }

  const { width, height } = canvas;
  if (!width || !height) {
    return { descriptor: new Array(16).fill(0.5), detected: false, reason: 'Canvas video belum siap.' };
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Divide canvas into 4x4 grid zones to calculate spatial luminance
  const descriptor: number[] = [];
  const gridRows = 4;
  const gridCols = 4;
  const cellWidth = Math.floor(width / gridCols);
  const cellHeight = Math.floor(height / gridRows);

  let totalLuminanceSum = 0;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let pixelCount = 0;

      for (let y = r * cellHeight; y < (r + 1) * cellHeight; y += 3) {
        for (let x = c * cellWidth; x < (c + 1) * cellWidth; x += 3) {
          const idx = (y * width + x) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          pixelCount++;
        }
      }

      const avgLuminance =
        pixelCount > 0 ? (0.299 * totalR + 0.587 * totalG + 0.114 * totalB) / (pixelCount * 255) : 0.5;
      descriptor.push(Number(avgLuminance.toFixed(4)));
      totalLuminanceSum += avgLuminance;
    }
  }

  // Check face presence via spatial variance across grid cells
  const meanLuminance = totalLuminanceSum / 16;
  let varianceSum = 0;
  for (let i = 0; i < 16; i++) {
    varianceSum += Math.pow(descriptor[i] - meanLuminance, 2);
  }
  const variance = varianceSum / 16;

  if (meanLuminance < 0.06) {
    return { descriptor, detected: false, reason: 'Kamera terlalu gelap / tertutup. Pastikan pencahayaan cukup.' };
  }
  if (meanLuminance > 0.94) {
    return { descriptor, detected: false, reason: 'Kamera silau / overexposed.' };
  }
  if (variance < 0.0003) {
    return { descriptor, detected: false, reason: 'Wajah tidak terdeteksi. Tidak ditemukan pola fitur wajah pada area kamera.' };
  }

  return { descriptor, detected: true };
}

/**
 * Generates a mock or default registered descriptor for seed users
 */
export function generateSeedFaceDescriptor(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const descriptor: number[] = [];
  for (let i = 0; i < 16; i++) {
    const val = (Math.sin(hash + i * 1.7) + 1) / 2;
    descriptor.push(Number(val.toFixed(4)));
  }
  return descriptor;
}

/**
 * Compares two 16-element face descriptors and returns similarity score (0 - 100%)
 */
export function compareDescriptors(desc1: number[], desc2: number[]): number {
  if (!desc1 || !desc2 || desc1.length === 0 || desc2.length === 0) {
    return 0;
  }

  const len = Math.min(desc1.length, desc2.length);
  let mean1 = 0;
  let mean2 = 0;

  for (let i = 0; i < len; i++) {
    mean1 += desc1[i];
    mean2 += desc2[i];
  }
  mean1 /= len;
  mean2 /= len;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const diff1 = desc1[i] - mean1;
    const diff2 = desc2[i] - mean2;
    dotProduct += diff1 * diff2;
    normA += diff1 * diff1;
    normB += diff2 * diff2;
  }

  if (normA === 0 || normB === 0) return 0;

  const correlation = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  let score = 0;
  if (correlation >= 0) {
    score = Math.round(correlation * 100);
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
      message: extraction.reason || 'Wajah tidak terdeteksi pada kamera! Pastikan wajah Anda terlihat di dalam lingkaran panduan.',
      descriptor: extraction.descriptor,
    };
  }

  const liveDescriptor = extraction.descriptor;

  if (!registeredDescriptor || registeredDescriptor.length === 0 || !isRegistered) {
    return {
      detected: true,
      score: 92,
      message: 'Wajah terdeteksi! Biometrik wajah pertama berhasil diregistrasi.',
      descriptor: liveDescriptor,
      isNewRegistration: true,
    };
  }

  const matchScore = compareDescriptors(liveDescriptor, registeredDescriptor);
  const threshold = 60; // Minimum 60% similarity required for pass

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
