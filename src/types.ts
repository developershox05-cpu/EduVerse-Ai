export interface UserStats {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  eduCoins: number;
  dailyUsageMinutes: number;
  isPremium: boolean;
  createdAt: string;
  invitedBy?: string;
  invitedFriendsCount?: number;
  invitedFriendsList?: string[];
}

export interface Book {
  id: string;
  title: string;
  description: string;
  details: string;
  coverUrl: string;
  pdfLink?: string;
  audioLink?: string;
  type: "pdf" | "audio" | "both";
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  views: string[]; // uids of users who viewed
  viewsCount: number;
  createdAt: string;
}

export interface Podcast {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  views: string[]; // uids of users who viewed
  viewsCount: number;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: string;
  likes: string[]; // uids of users who liked
  likesCount: number;
  replies?: Array<{
    id: string;
    userId: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  imageUrl?: string;
  likes: string[]; // uids of users who liked
  likesCount: number;
  views: string[]; // uids of users who viewed
  viewsCount: number;
  createdAt: string;
  commentsCount: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
  active: boolean;
}

export interface GroupMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

export interface VoiceGroup {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  active: boolean;
  createdAt: string;
  participants: Array<{
    uid: string;
    name: string;
    photo?: string;
  }>;
}

export interface LiveBroadcast {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  active: boolean;
  createdAt: string;
  likesCount: number;
}

export interface LiveComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}
