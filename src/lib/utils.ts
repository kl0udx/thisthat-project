import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const colors = ['Blue', 'Red', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Cyan'];
const animals = ['Tiger', 'Panda', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Dolphin'];

// Vibrant colors that work well with white text
const avatarColors = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEEAD', // Cream Yellow
  '#D4A5A5', // Dusty Rose
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#E67E22', // Orange
  '#2ECC71', // Green
  '#E74C3C', // Red
  '#1ABC9C', // Teal
];

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateNickname(): string {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${color} ${animal}`;
}

export function generateAvatarColor(nickname: string): string {
  // Use the nickname to generate a consistent color for the same nickname
  const hash = nickname.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Use the hash to select a color from our predefined palette
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getAvatarColor(nickname: string): string {
  // Create a simple hash from the nickname
  const hash = nickname.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  // Use the hash to select a color
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export function getInitials(nickname: string): string {
  return nickname
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
