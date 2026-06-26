/**
 * Dynamically generates a premium SVG-based snooker player avatar as a Data URL.
 * It uses high-contrast, lounge-themed snooker ball colors and clean modern shapes.
 */
export function generateSnookerAvatar(name: string, seed: number): string {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Snooker ball colors (1: Red, 2: Yellow, 3: Green, 4: Brown, 5: Blue, 6: Pink, 7: Black, 0: Gold/Cue)
  const colors = [
    { bg: '#e11d48', text: '#ffffff', name: 'Red' }, // Red
    { bg: '#ca8a04', text: '#1e293b', name: 'Yellow' }, // Yellow
    { bg: '#15803d', text: '#ffffff', name: 'Green' }, // Green
    { bg: '#854d0e', text: '#ffffff', name: 'Brown' }, // Brown
    { bg: '#1d4ed8', text: '#ffffff', name: 'Blue' }, // Blue
    { bg: '#db2777', text: '#ffffff', name: 'Pink' }, // Pink
    { bg: '#0f172a', text: '#f8fafc', name: 'Black' }, // Black
    { bg: '#b45309', text: '#ffffff', name: 'Bronze' }, // Bronze
    { bg: '#d97706', text: '#ffffff', name: 'Gold' }, // Gold
    { bg: '#0d9488', text: '#ffffff', name: 'Teal' }, // Teal
  ];

  const color = colors[seed % colors.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="grad-${seed}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
          <stop offset="50%" stop-color="${color.bg}" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
        </radialGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <stop offset="100%" stop-color="#000000" />
        </filter>
      </defs>
      
      <!-- Table felt texture background -->
      <rect width="120" height="120" fill="#0f172a" rx="16"/>
      
      <!-- Outer ring (Gold lounge theme) -->
      <circle cx="60" cy="60" r="54" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-opacity="0.4" />
      
      <!-- Crossed snooker cue sticks -->
      <line x1="20" y1="100" x2="100" y2="20" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.4"/>
      <line x1="20" y1="100" x2="45" y2="75" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.4"/>
      
      <!-- Main ball circle -->
      <circle cx="60" cy="60" r="42" fill="url(#grad-${seed})" />
      
      <!-- Highlight spot to give realistic snooker ball shine -->
      <ellipse cx="48" cy="42" rx="12" ry="6" fill="#ffffff" fill-opacity="0.4" transform="rotate(-30 48 42)"/>
      
      <!-- Player Initials -->
      <text x="60" y="65" font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="24" fill="${color.text}" text-anchor="middle" dominant-baseline="middle" opacity="0.95">${initials}</text>
      
      <!-- Seed badge circle -->
      <circle cx="90" cy="90" r="14" fill="#1e293b" stroke="#d4af37" stroke-width="1" />
      <text x="90" y="91" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="10" fill="#d4af37" text-anchor="middle" dominant-baseline="middle">#${seed}</text>
    </svg>
  `
    .replace(/\s+/g, ' ')
    .trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
