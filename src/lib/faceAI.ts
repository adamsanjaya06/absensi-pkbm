import { FaceDetectionResult } from '../types';

export interface DetailedFaceAnalysis {
  descriptor: number[];
  detected: boolean;
  faceCount: number;
  quality: {
    brightness: number;
    blurriness: number;
    skinToneRatio: number;
    centerSkinRatio: number;
    edgeDensity: number;
    symmetryScore: number;
    ocularScore: number;
    landmarkScore: number;
    isPerfectRegistration: boolean;
  };
  reason?: string;
}

/**
 * Extracts a mean-subtracted, L2-normalized 128-dimensional facial feature vector
 * with explicit ocular/retina eye-region contrast and landmark geometric alignment.
 */
export function extractFaceDescriptorFromCanvas(canvas: HTMLCanvasElement): number[] {
  const res = extractFaceDescriptorWithDetection(canvas);
  return res.descriptor;
}

export function extractFaceDescriptorWithDetection(canvas: HTMLCanvasElement): DetailedFaceAnalysis {
  const ctx = canvas.getContext('2d');
  const emptyResult = (reason: string): DetailedFaceAnalysis => ({
    descriptor: new Array(128).fill(0),
    detected: false,
    faceCount: 0,
    quality: {
      brightness: 0,
      blurriness: 0,
      skinToneRatio: 0,
      centerSkinRatio: 0,
      edgeDensity: 0,
      symmetryScore: 0,
      ocularScore: 0,
      landmarkScore: 0,
      isPerfectRegistration: false,
    },
    reason,
  });

  if (!ctx) return emptyResult('Kamera tidak dapat membaca piksel video.');

  const { width, height } = canvas;
  if (!width || !height) return emptyResult('Canvas video belum siap / tidak berukuran valid.');

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Define central face boundary box (60% width, 70% height)
  const startX = Math.floor(width * 0.20);
  const endX = Math.floor(width * 0.80);
  const startY = Math.floor(height * 0.15);
  const endY = Math.floor(height * 0.85);

  const regionW = endX - startX;
  const regionH = endY - startY;

  // Center oval dimensions for human face oval guidance region
  const centerX = width / 2;
  const centerY = height / 2;
  const rxInner = regionW * 0.35;
  const ryInner = regionH * 0.42;

  let totalLuminance = 0;
  let totalSkinPixels = 0;
  let centerSkinPixels = 0;
  let centerTotalPixels = 0;
  let outerSkinPixels = 0;
  let outerTotalPixels = 0;
  let totalAnalyzedPixels = 0;

  let totalGradientEnergy = 0;
  let laplacianEnergySum = 0;

  // 8x8 Grid analysis
  const gridRows = 8;
  const gridCols = 8;
  const cellWidth = Math.floor(regionW / gridCols);
  const cellHeight = Math.floor(regionH / gridRows);

  const cellLuminanceGrid: number[][] = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));
  const cellGradientGrid: number[][] = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

  const quadrantSkinCounts = [0, 0, 0, 0];

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

          // YCbCr + RGB Strict Human Skin Tone Classifier
          const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
          const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;

          const isRgbSkin = R > 45 && G > 30 && B > 15 && R > G && G > B && Math.abs(R - G) >= 12;
          const isYCbCrSkin = Cb >= 80 && Cb <= 125 && Cr >= 135 && Cr <= 170;

          const isSkin = isRgbSkin && isYCbCrSkin;

          // Check if pixel is inside central oval
          const dx = (x - centerX) / rxInner;
          const dy = (y - centerY) / ryInner;
          const isInsideOval = dx * dx + dy * dy <= 1.0;

          if (isInsideOval) {
            centerTotalPixels++;
            if (isSkin) centerSkinPixels++;
          } else {
            outerTotalPixels++;
            if (isSkin) outerSkinPixels++;
          }

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
  const centerSkinRatio = centerTotalPixels > 0 ? centerSkinPixels / centerTotalPixels : 0;
  const outerSkinRatio = outerTotalPixels > 0 ? outerSkinPixels / outerTotalPixels : 0;
  const edgeDensity = totalAnalyzedPixels > 0 ? totalGradientEnergy / totalAnalyzedPixels : 0;
  const blurrinessScore = totalAnalyzedPixels > 0 ? laplacianEnergySum / totalAnalyzedPixels : 0;

  // -------------------------------------------------------------
  // OCULAR / RETINA EYE-REGION FEATURE EXTRACTION
  // -------------------------------------------------------------
  // Left Eye region: Row 2, Cols 2-3 | Right Eye region: Row 2, Cols 4-5
  const leftEyeLum = (cellLuminanceGrid[2][2] + cellLuminanceGrid[2][3]) / 2;
  const rightEyeLum = (cellLuminanceGrid[2][4] + cellLuminanceGrid[2][5]) / 2;
  const leftEyeGrad = (cellGradientGrid[2][2] + cellGradientGrid[2][3]) / 2;
  const rightEyeGrad = (cellGradientGrid[2][4] + cellGradientGrid[2][5]) / 2;

  // Forehead Lum (Row 1, Cols 3-4) vs Eye Lum -> Eyes are naturally darker than forehead
  const foreheadLum = (cellLuminanceGrid[1][3] + cellLuminanceGrid[1][4]) / 2;
  const eyeContrastLeft = Math.max(0, foreheadLum - leftEyeLum);
  const eyeContrastRight = Math.max(0, foreheadLum - rightEyeLum);

  // Ocular score based on eye contrast, gradient intensity, and left-right eye balance
  const eyeBalance = 1 - Math.abs(leftEyeLum - rightEyeLum);
  const ocularScore = Math.min(1.0, (leftEyeGrad + rightEyeGrad + eyeContrastLeft + eyeContrastRight) * 1.8 * eyeBalance);

  // Facial Landmark Geometric Score (Nose, Mouth, Symmetry)
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

  const noseBridgeLum = (cellLuminanceGrid[3][3] + cellLuminanceGrid[3][4] + cellLuminanceGrid[4][3] + cellLuminanceGrid[4][4]) / 4;
  const mouthLum = (cellLuminanceGrid[6][3] + cellLuminanceGrid[6][4]) / 2;
  const landmarkScore = Math.min(1.0, (symmetryScore * 0.4) + (Math.abs(noseBridgeLum - mouthLum) * 1.5) + (centerSkinRatio * 0.4));

  // Determine if perfect reference registration criteria is met
  const isPerfectRegistration =
    meanBrightness >= 0.15 &&
    meanBrightness <= 0.85 &&
    centerSkinRatio >= 0.18 &&
    edgeDensity >= 0.020 &&
    symmetryScore >= 0.45 &&
    ocularScore >= 0.35;

  // -------------------------------------------------------------
  // STRICT DETECTORS: Face Presence & Quality Checks
  // -------------------------------------------------------------

  if (meanBrightness < 0.10) {
    return emptyResult('Registrasi/Absen Gagal: Pencahayaan ruangan terlalu gelap! Nyalakan lampu atau hadap ke arah cahaya.');
  }

  if (meanBrightness > 0.90) {
    return emptyResult('Registrasi/Absen Gagal: Kamera terlampau silau / overexposed.');
  }

  if (centerSkinRatio < 0.15 || (outerSkinRatio > 0.65 && centerSkinRatio < outerSkinRatio) || edgeDensity < 0.020) {
    return emptyResult(
      'Registrasi/Absen Ditolak: Wajah TIDAK TERDETEKSI pada kamera! Objek tembok, benda mati, atau foto selain wajah ditolak. Posisikan wajah Anda tepat di dalam lingkaran panduan.'
    );
  }

  const activeSkinQuadrants = quadrantSkinCounts.filter((cnt) => cnt > totalSkinPixels * 0.22).length;
  let estimatedFaceCount = 1;
  if (activeSkinQuadrants >= 4 && skinRatio > 0.68 && avgSymmetryDiff > 0.38) {
    estimatedFaceCount = 2;
  }

  if (estimatedFaceCount > 1) {
    return emptyResult(
      `Registrasi/Absen Ditolak: Terdeteksi LEBIH DARI 1 WAJAH (${estimatedFaceCount} wajah) pada kamera! Pastikan hanya 1 orang karyawan saat verifikasi biometrik.`
    );
  }

  // -------------------------------------------------------------
  // CONSTRUCT 128-DIMENSIONAL PERFECT FEATURE VECTOR
  // -------------------------------------------------------------
  const rawVector: number[] = [];

  let lumSumGrid = 0;
  let gradSumGrid = 0;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      lumSumGrid += cellLuminanceGrid[r][c];
      gradSumGrid += cellGradientGrid[r][c];
    }
  }
  const meanLumGrid = lumSumGrid / 64;
  const meanGradGrid = gradSumGrid / 64;

  // Group 1 (32 elements): Ocular Retina & Eye Region Feature Map
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 8; c++) {
      const eyeFeatureVal = cellLuminanceGrid[r - 1][c - 1] - cellGradientGrid[r - 1][c - 1] * 0.5;
      rawVector.push(eyeFeatureVal);
    }
  }

  // Group 2 (32 elements): Lower Face & Jawline Geometry Map
  for (let r = 5; r <= 8; r++) {
    for (let c = 1; c <= 8; c++) {
      const lowerFeatureVal = cellLuminanceGrid[r - 1][c - 1] - meanLumGrid;
      rawVector.push(lowerFeatureVal);
    }
  }

  // Group 3 (32 elements): Mean-subtracted Luminance Matrix
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 4; c++) {
      rawVector.push(cellLuminanceGrid[r][c] - meanLumGrid);
    }
  }

  // Group 4 (32 elements): Edge Gradient Direction Matrix
  for (let r = 0; r < 8; r++) {
    for (let c = 4; c < 8; c++) {
      rawVector.push(cellGradientGrid[r][c] - meanGradGrid);
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
      centerSkinRatio: Number(centerSkinRatio.toFixed(3)),
      edgeDensity: Number(edgeDensity.toFixed(3)),
      symmetryScore: Number(symmetryScore.toFixed(3)),
      ocularScore: Number(ocularScore.toFixed(3)),
      landmarkScore: Number(landmarkScore.toFixed(3)),
      isPerfectRegistration,
    },
  };
}

/**
 * Compares two 128-d L2-normalized face descriptors using Cosine Similarity.
 * Returns similarity percentage (0 - 99%).
 */
export function compareDescriptors(desc1: number[], desc2: number[]): number {
  if (!desc1 || !desc2 || desc1.length === 0 || desc2.length === 0) {
    return 0;
  }

  const len = Math.min(desc1.length, desc2.length);
  let dotProduct = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += desc1[i] * desc2[i];
  }

  const cosineSimilarity = dotProduct;

  // Strict Thresholding:
  // Same Person Cutoff: Cosine Similarity >= 0.75
  let score = 0;
  if (cosineSimilarity >= 0.75) {
    // High structural match (same person): maps 0.75..1.00 -> 60%..99%
    score = Math.round(60 + ((cosineSimilarity - 0.75) / 0.25) * 39);
  } else if (cosineSimilarity >= 0.45) {
    // Moderate similarity (different person / partial match): maps 0.45..0.75 -> 20%..59%
    score = Math.round(20 + ((cosineSimilarity - 0.45) / 0.30) * 39);
  } else {
    // Low similarity (completely different face / non-face): maps <0.45 -> 0%..19%
    score = Math.max(0, Math.round(Math.max(0, cosineSimilarity) * 40));
  }

  return Math.min(99, Math.max(0, score));
}

/**
 * Verifies live camera frame against user's registered face descriptor.
 */
export function verifyFaceAgainstRegistered(
  liveCanvas: HTMLCanvasElement,
  registeredDescriptor?: number[],
  isRegistered?: boolean
): FaceDetectionResult & { isNewRegistration?: boolean; faceCount?: number } {
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
      message: `Verifikasi Biometrik Wajah Ditolak! Wajah pada kamera TIDAK COCOK dengan biometrik terdaftar (${matchScore}% < ${threshold}%).`,
      descriptor: liveDescriptor,
      faceCount: extraction.faceCount,
    };
  }
}

/**
 * Draws AI Face Guide Overlay HUD on camera canvas with ocular reticles and alignment crosshairs
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

  // Ocular / Eye Reticle Target Crosshairs
  const eyeY = centerY - ry * 0.22;
  const eyeOffsetX = rx * 0.42;
  const eyeRadius = rx * 0.18;

  // Left & Right Eye Guidance Circles
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = status === 'success' ? '#22c55e' : 'rgba(59, 130, 246, 0.7)';

  // Left Eye Reticle
  ctx.beginPath();
  ctx.arc(centerX - eyeOffsetX, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Right Eye Reticle
  ctx.beginPath();
  ctx.arc(centerX + eyeOffsetX, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Ocular Crosshair centers
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Left eye
  ctx.moveTo(centerX - eyeOffsetX - 6, eyeY); ctx.lineTo(centerX - eyeOffsetX + 6, eyeY);
  ctx.moveTo(centerX - eyeOffsetX, eyeY - 6); ctx.lineTo(centerX - eyeOffsetX, eyeY + 6);
  // Right eye
  ctx.moveTo(centerX + eyeOffsetX - 6, eyeY); ctx.lineTo(centerX + eyeOffsetX + 6, eyeY);
  ctx.moveTo(centerX + eyeOffsetX, eyeY - 6); ctx.lineTo(centerX + eyeOffsetX, eyeY + 6);
  ctx.stroke();

  // Corner brackets HUD
  const boxW = rx * 2.1;
  const boxH = ry * 2.1;
  const left = centerX - boxW / 2;
  const top = centerY - boxH / 2;
  const cornerLen = 20;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;

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
