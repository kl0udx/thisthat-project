export interface Room {
  code: string; // 8-digit alphanumeric
  hostId: string;
  aiProvider: {
    type: 'openai' | 'anthropic' | 'google';
    model: string;
  };
  createdAt: Date;
}

export interface User {
  id: string;
  userId: string;
  nickname: string; // Format: "Blue Tiger", "Red Panda"
  isHost: boolean;
  avatarColor: string; // hex color for avatar background
} 