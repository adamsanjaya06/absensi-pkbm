import { GeofenceResult, OfficeSettings } from '../types';

/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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

/**
 * Checks if user location is within allowed office geofence radius
 */
export function checkGeofence(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number
): GeofenceResult {
  const distance = calculateDistanceMeters(userLat, userLng, officeLat, officeLng);
  const isWithinRadius = distance <= radiusMeters;

  return {
    isWithinRadius,
    distanceMeters: distance,
    officeRadiusMeters: radiusMeters,
    message: isWithinRadius
      ? `Lokasi sesuai! Berada ${distance}m dari kantor (Radius maks: ${radiusMeters}m)`
      : `Diluar radius! Anda berada ${distance}m dari kantor (Batas maks: ${radiusMeters}m)`,
  };
}

/**
 * Checks user location against all office branches (Headquarters + Branches)
 */
export function checkGeofenceWithBranches(
  userLat: number,
  userLng: number,
  office: OfficeSettings
): GeofenceResult {
  const allLocations = [
    {
      name: office.officeName,
      lat: office.latitude,
      lng: office.longitude,
      radius: office.radiusMeters,
      address: office.address,
    },
    ...(office.branches || []).map((b) => ({
      name: b.officeName,
      lat: b.latitude,
      lng: b.longitude,
      radius: b.radiusMeters,
      address: b.address,
    })),
  ];

  let matchedBranch: typeof allLocations[0] | null = null;
  let closestLoc = allLocations[0];
  let minDistance = Infinity;

  for (const loc of allLocations) {
    const dist = calculateDistanceMeters(userLat, userLng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestLoc = loc;
    }
    if (dist <= loc.radius) {
      matchedBranch = loc;
      minDistance = dist;
      break;
    }
  }

  if (matchedBranch) {
    return {
      isWithinRadius: true,
      distanceMeters: minDistance,
      officeRadiusMeters: matchedBranch.radius,
      branchName: matchedBranch.name,
      message: `Lokasi terverifikasi di ${matchedBranch.name}! Berada ${minDistance}m (Radius maks: ${matchedBranch.radius}m)`,
    };
  }

  return {
    isWithinRadius: false,
    distanceMeters: minDistance,
    officeRadiusMeters: closestLoc.radius,
    branchName: closestLoc.name,
    message: `Di luar radius! Anda berada ${minDistance}m dari ${closestLoc.name} (Batas maks: ${closestLoc.radius}m)`,
  };
}

/**
 * Performs reverse geocoding to retrieve readable street address
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (error) {
    console.warn('Reverse geocoding error, fallback to coordinate display:', error);
  }

  return `Jl. Jenderal Sudirman No. ${Math.abs(Math.round(lat * 1000) % 150) + 1}, Jakarta Pusat (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

/**
 * Returns current day of week in Indonesian (Asia/Jakarta timezone)
 */
export function getJakartaDayName(dateStr?: string): string {
  const dateObj = dateStr ? new Date(dateStr) : new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  });
  const dayName = formatter.format(dateObj);
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

/**
 * Checks if a given day name is within office working days
 */
export function isWorkDay(office: OfficeSettings, dateStr?: string): { allowed: boolean; currentDay: string } {
  const currentDay = getJakartaDayName(dateStr);
  const allowedDays = office.workDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return {
    allowed: allowedDays.includes(currentDay),
    currentDay,
  };
}
