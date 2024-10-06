// Define the types for the coordinates and location objects
type Coordinates = {
    lat?: number;
    lon?: number;
    [key: string]: any;
};


// Haversine distance function with typed parameters
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
}

// Find nearest location function with typed parameters
export function findNearestLocation<T>(
    object: Coordinates,
    locations: Array<T & Coordinates>
): T | null {
    let nearest: Coordinates | null = null;
    let minDistance = Infinity;

    locations.forEach(location => {
        const distance = haversineDistance(object.lat || -1, object.lon || -1, location.lat || -1, location.lon || -1);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = location;
        }
    });

    return nearest;
}
