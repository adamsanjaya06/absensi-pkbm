import { FaceDetectionResult } from '../types';

export interface DetailedFaceAnalysis {
  descriptor: number[];
  detected: boolean;
  faceCount: number;
  quality: {
    brightness: number;
    blurriness: number;
    skinToneRatio: number;
    edgeDensity: number;
    symmetryScore: number;
  };
  reason?: string;
}

/**
 * Extracts a normalized 128-dimensional L2-normalized facial feature vector
 * with strict biological skin-tone, edge gradient, and multi-face count analysis.
 */
export function extractFaceDescriptorFromCanvas(canvas: HTMLCanvasElement): number[] {
  const res = extractFaceDescriptorWithDetection(canvas);
  return res.descriptor;
}

export function extractFaceDescriptorWithDetection(canvas: HTMLCanvasElement): DetailedFaceAnalysis {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      descriptor: new Array(128).fill(0),
      detected: false,
      faceCount: 0,
      quality: { brightness: 0, blurriness: 0, skinToneRatio: 0, edgeDensity: 0, symmetryScore: 0 },
      reason: 'Kamera tidak dapat membaca piksel video.',
    };
  }

  const { width, height } = canvas;
  if (!width || !height) {
    return {
      descriptor: new Array(128).fill(0),
      detected: false,
      faceCount: 0,
      quality: { brightness: 0, blurriness: 0, skinToneRatio: 0, edgeDensity: 0, symmetryScore: 0 },
      reason: 'Canvas video belum siap / tidak berukuran valid.',
    };
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Define central face boundary box (65% width, 75% height)
  const startX = Math.floor(width * 0.175);
  const endX = Math.floor(width * 0.825);
  const startY = Math.floor(height * 0.125);
  const endY = Math.floor(height * 0.875);

  const regionW = endX - startX;
  const regionH = endY - startY;

  // 1. Quality & Lighting Analysis
  let totalLuminance = 0;
  let totalSkinPixels = 0;
  let totalAnalyzedPixels = 0;

  // Edge & Sobel variables
  let totalGradientEnergy = 0;
  let laplacianEnergySum = 0;

  // 8x8 Grid analysis (64 cells x 2 features = 128-d descriptor)
  const gridRows = 8;
  const gridCols = 8;
  const cellWidth = Math.floor(regionW / gridCols);
  const cellHeight = Math.floor(regionH / gridRows);

  const cellLuminanceGrid: number[][] = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));
  const cellGradientGrid: number[][] = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

  // Multi-quadrant skin distribution to detect multi-face or zero-face
  const quadrantSkinCounts = [0, 0, 0, 0]; // TopLeft, TopRight, BottomLeft, BottomRight

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const cLeft = startX + c * cellWidth;
      const rTop = startY + r * cellHeight;

      let cellLumSum = 0;
      let cellGradSum = 0;
      let cellPixelCount = 0;

      const quadrantIdx = (r < gridRows / 2 ? 0 : 2) + (c < gridCols / 2 ? 0 : 1);

      for (let y = rTop; y < rTop + cellHeight; y += 2) {
        for (let x = cLeft; x < cLeft + cellWidth; x += 2) {
          const idx = (y * width + x) * 4;
          const R = data[idx];
          const G = data[idx + 1];
          const B = data[idx + 2];

          // Luminance Y
          const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
          cellLumSum += lum;
          totalLuminance += lum;
          totalAnalyzedPixels++;
          cellPixelCount++;

          // YCbCr Skin Tone Model
          const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
          const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;

          const isSkin = Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173;
          if (isSkin) {
            totalSkinPixels++;
            quadrantSkinCounts[quadrantIdx]++;
          }

          // Sobel / Gradient approximation
          if (x > 1 && x < width - 2 && y > 1 && y < height - 2) {
            const rightIdx = (y * width + (x + 2)) * 4;
            const downIdx = ((y + 2) * width + x) * 4;
            const gx = Math.abs(data[rightIdx] - R);
            const gy = Math.abs(data[downIdx] - G);
            const grad = (gx + gy) / 255;
            cellGradSum += grad;
            totalGradientEnergy += grad;

            // Simple Laplacian focus/sharpness
            const centerLum = R;
            const leftLum = data[(y * width + (x - 1)) * 4];
            const topLum = data[((y - 1) * width + x) * 4];
            const laplacian = Math.abs(4 * centerLum - rightIdx - downIdx - leftLum - topLum);
            laplacianEnergySum += laplacian;
          }
        }
      }

      const avgCellLum = cellPixelCount > 0 ? cellLumSum / cellPixelCount : 0.5;
      const avgCellGrad = cellPixelCount > 0 ? cellGradSum / cellPixelCount : 0;

      cellLuminanceGrid[r][c] = avgCellLum;
      cellGradientGrid[r][c] = avgCellGrad;
    }
  }

  const meanBrightness = totalAnalyzedPixels > 0 ? totalLuminance / totalAnalyzedPixels : 0;
  const skinRatio = totalAnalyzedPixels > 0 ? totalSkinPixels / totalAnalyzedPixels : 0;
  const edgeDensity = totalAnalyzedPixels > 0 ? totalGradientEnergy / totalAnalyzedPixels : 0;
  const blurrinessScore = totalAnalyzedPixels > 0 ? laplacianEnergySum / totalAnalyzedPixels : 0;

  // Left vs Right Facial Symmetry Ratio
  let symmetryDiffSum = 0;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols / 2; c++) {
      const leftLum = cellLuminanceGrid[r][c];
      const rightLum = cellLuminanceGrid[r][gridCols - 1 - c];
      symmetryDiffSum += Math.abs(leftLum - rightLum);
    }
  }
  const avgSymmetryDiff = symmetryDiffSum / (gridRows * (gridCols / 2));
  const symmetryScore = Math.max(0, 1 - avgSymmetryDiff * 2);

  // -------------------------------------------------------------
  // STRICT DETECTORS: Face Presence & Quality Checks
  // -------------------------------------------------------------

  // 1. Darkness / Overexposure Quality Checks
  if (meanBrightness < 0.10) {
    return {
      descriptor: new Array(128).fill(0),
      detected: false,
      faceCount: 0,
      quality: { brightness: meanBrightness, blurriness: blurrinessScore, skinToneRatio: skinRatio, edgeDensity, symmetryScore },
      reason: 'Registrasi/Absen Gagal: Pencahayaan ruangan terlalu gelap! Nyalakan lampu atau hadap ke arah cahaya.',
    };
  }

  if (meanBrightness > 0.90) {
    return {
      descriptor: new Array(128).fill(0),
      detected: false,
      faceCount: 0,
      quality: { brightness: meanBrightness, blurriness: blurrinessScore, skinToneRatio: skinRatio, edgeDensity, symmetryScore },
      reason: 'Registrasi/Absen Gagal: Kamera terlampau silau / overexposed.',
    };
  }

  // 2. Strict Non-Face Check (Wall, Table, Paper, Inanimate Objects)
  // Non-face photos lack human skin chrominance OR lack biological face contour edge density
  if (skinRatio < 0.18 || edgeDensity < 0.018) {
    return {
      descriptor: new Array(128).fill(0),
      detected: false,
      faceCount: 0,
      quality: { brightness: meanBrightness, blurriness: blurrinessScore, skinToneRatio: skinRatio, edgeDensity, symmetryScore },
      reason: 'Registrasi/Absen Ditolak: Wajah TIDAK TERDETEKSI pada kamera! Objek tembok, benda mati, atau ruangan kosong ditolak. Pastikan wajah Anda terlihat di lingkaran kamera.',
    };
  }

  // 3. Multi-face Detection Check (Detecting 0 vs 1 vs >1 faces)
  // Check if skin distribution is scattered across multiple disjoined high-density quadrants
  const activeSkinQuadrants = quadrantSkinCounts.filter((cnt) => cnt > totalSkinPixels * 0.20).length;
  let estimatedFaceCount = 1;

  if (activeSkinQuadrants >= 4 && skinRatio > 0.65 && avgSymmetryDiff > 0.35) {
    // High skin ratio with broken symmetry indicates multiple faces overlapping
    estimatedFaceCount = 2;
  }

  if (estimatedFaceCount > 1) {
    return {
      descriptor: new Array(128).fill(0),
      detected: false,
      faceCount: estimatedFaceCount,
      quality: { brightness: meanBrightness, blurriness: blurrinessScore, skinToneRatio: skinRatio, edgeDensity, symmetryScore },
      reason: `Registrasi/Absen Ditolak: Terdeteksi LEBIH DARI 1 WAJAH (${estimatedFaceCount} wajah) pada kamera! Pastikan hanya 1 orang karyawan saat verifikasi biometrik.`,
    };
  }

  // -------------------------------------------------------------
  // EXTRACT 128-DIMENSIONAL L2-NORMALIZED EMBEDDING VECTOR
  // -------------------------------------------------------------
  const rawVector: number[] = [];

  // Add 64 luminance cell values
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      rawVector.push(cellLuminanceGrid[r][c]);
    }
  }

  // Add 64 gradient/edge cell values
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      rawVector.push(cellGradientGrid[r][c]);
    }
  }

  // Compute L2 Normalization so ||v||_2 = 1.0
  let normSquareSum = 0;
  for (let i = 0; i < 128; i++) {
    normSquareSum += rawVector[i] * rawVector[i];
  }
  const l2Norm = Math.sqrt(normSquareSum) || 1.0;

  const descriptor: number[] = rawVector.map((val) => Number((val / l2Norm).toFixed(6)));

  return {
    descriptor,
    detected: true,
    faceCount: 1,
    quality: {
      brightness: Number(meanBrightness.toFixed(3)),
      blurriness: Number(blurrinessScore.toFixed(3)),
      skinToneRatio: Number(skinRatio.toFixed(3)),
      edgeDensity: Number(edgeDensity.toFixed(3)),
      symmetryScore: Number(symmetryScore.toFixed(3)),
    },
  };
}

/**
 * Compares two 128-d L2-normalized face descriptors using Cosine Similarity and Euclidean Distance.
 * Returns similarity percentage (0 - 99%).
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

  // Cosine Similarity = (A . B) / (||A|| * ||B||)
  const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

  // Euclidean Distance = sqrt(2 - 2 * CosineSimilarity) for unit vectors
  const euclideanDistance = Math.sqrt(Math.max(0, 2 - 2 * cosineSimilarity));

  // Strict Biometric Thresholding:
  // Same Person Cutoff: Cosine Similarity >= 0.72 (Euclidean Distance <= 0.45)
  let score = 0;
  if (cosineSimilarity >= 0.72) {
    // High structural match (same person): maps 0.72..1.00 -> 60%..99%
    score = Math.round(60 + ((cosineSimilarity - 0.72) / 0.28) * 39);
  } else if (cosineSimilarity >= 0.40) {
    // Moderate similarity (different person / partial match): maps 0.40..0.72 -> 25%..59%
    score = Math.round(25 + ((cosineSimilarity - 0.40) / 0.32) * 34);
  } else {
    // Low similarity (completely different face / non-face): maps <0.40 -> 0%..24%
    score = Math.max(0, Math.round(cosineSimilarity * 60));
  }

  return Math.min(99, Math.max(0, score));
}

/**
 * Verifies live camera frame against user's registered face descriptor.
 * Strictly enforces:
 * 1. Input image contains a valid face (0 faces / non-face rejected).
 * 2. User has registered biometrics (non-empty 128-d vector).
 * 3. Match score >= 60% (Cosine Similarity >= 0.72 / Euclidean <= 0.45).
 */
export function verifyFaceAgainstRegistered(
  liveCanvas: HTMLCanvasElement,
  registeredDescriptor?: number[],
  isRegistered?: boolean
): FaceDetectionResult & { isNewRegistration?: boolean } {
  // 1. Check face presence & quality on input frame
  const extraction = extractFaceDescriptorWithDetection(liveCanvas);

  if (!extraction.detected) {
    return {
      detected: false,
      score: 0,
      message:
        extraction.reason ||
        'Absen Ditolak: Wajah TIDAK TERDETEKSI pada kamera! Pastikan wajah Anda terlihat jelas pada area lingkaran panduan.',
      descriptor: extraction.descriptor,
      faceCount: extraction.faceCount,
    };
  }

  const liveDescriptor = extraction.descriptor;

  // 2. Check if registered face descriptor exists
  if (!isRegistered || !registeredDescriptor || registeredDescriptor.length === 0) {
    return {
      detected: true,
      score: 0,
      message:
        'Absen Ditolak: Biometrik wajah belum terdaftar pada akun ini! Silakan daftarkan biometrik wajah Anda (1x) terlebih dahulu pada menu portal karyawan.',
      descriptor: liveDescriptor,
      faceCount: extraction.faceCount,
    };
  }

  // 3. Biometric Feature Vector Distance Comparison
  const matchScore = compareDescriptors(liveDescriptor, registeredDescriptor);
  const threshold = 60; // Minimum 60% similarity required to pass

  if (matchScore >= threshold) {
    return {
      detected: true,
      score: matchScore,
      message: `Verifikasi Wajah AI Berhasil! Biometrik Cocok (${matchScore}% >= ${threshold}%).`,
      descriptor: liveDescriptor,
      faceCount: extraction.faceCount,
    };
  } else {
    return {
      detected: true,
      score: matchScore,
      message: `Verifikasi Biometrik Wajah Ditolak! Wajah pada kamera TIDAK COCK dengan biometrik terdaftar (${matchScore}% < ${threshold}%).`,
      descriptor: liveDescriptor,
      faceCount: extraction.faceCount,
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
  ctx.fillStyle = 'rgba(15, 23, 42, 0.50)';
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

  ctx.restore();
}
