export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isPrivate: boolean;
  isFollowing?: boolean;
}

export interface PostItem {
  id: string;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  caption?: string;
  location?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media: Array<{ url: string; order: number }>;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  mediaUrl: string;
  type: 'PHOTO' | 'VIDEO' | 'TEXT';
  textOverlay?: string;
  bgColor?: string;
  isViewed: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface StoryTray {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  hasUnseen: boolean;
  stories: StoryItem[];
}

export interface ReelItem {
  id: string;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFollowing: boolean;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  audioTitle?: string;
  audioArtist?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  isDelivered: boolean;
  isRead: boolean;
  createdAt: string;
}
