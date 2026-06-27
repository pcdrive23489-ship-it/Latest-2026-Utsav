
export type UserProfile = {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'super-admin' | 'admin' | 'member';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string; // ISO 8601 string from Supabase
    bio?: string;
    location?: string;
    website?: string;
    photoURL?: string;
}

export type FestivalEvent = {
    id: string;
    title: string;
    date: string;
    time: string;
    description: string;
}

export type DonationTransparency = {
    decoration: number;
    prasad: number;
    programs: number;
    logistics: number;
    qrCodeUrl?: string;
    upiId?: string;
}

export type CollectionEntry = {
    id:string;
    section: string;
    name: string;
    date: string;
    expected: number;
    received: number;
    status: 'Paid' | 'Pending';
}

export type FinanceStatementItem = {
    item: string;
    amount: number;
}

export type FinanceData = {
    assets: FinanceStatementItem[];
    liabilities: FinanceStatementItem[];
    income: FinanceStatementItem[];
    expenses: FinanceStatementItem[];
}

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  mediaUrl: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  createdAt: string; // ISO 8601 string from Supabase
  isSeen: boolean;
  replyTo?: string | null;
  replyToContent?: {
      text: string;
      userName: string;
  }
  reactions?: {
      [emoji: string]: string[];
  };
  isEdited?: boolean;
  userName?: string;
  userAvatar?: string;
  fileName?: string;
};

export type Countdown = {
    id: string;
    name: string;
    targetDate: string; // ISO string format
}

export type DonationRecord = {
    id: string;
    donorName: string;
    amount: number;
    purpose?: string;
    proofImageUrl: string;
    status: 'pending' | 'verified';
    createdAt: string; // ISO 8601 string
}

export type DevotionalSong = {
    id: string;
    title: string;
    link: string;
    addedBy: string;
    userId: string;
}
    
export type Announcement = {
    id: string;
    title: string;
    content: string;
}

export type RangoliPrize = {
    rank: string;
    prize: string;
}

export type RangoliCompetitionData = {
    prizes: RangoliPrize[];
    announcementDate: string;
    criteria: string;
}

export type RangoliEntry = {
    id: string;
    artistName: string;
    imageUrl: string;
    artistImageUrl?: string;
    votes: number;
    description?: string;
}

export type StorageCleanupLog = {
    id: string;
    bucket: string;
    path: string;
    sourceTable: string;
    sourceId?: string;
    action: string; // UPDATE | DELETE
    status: 'deleted' | 'skipped_referenced' | 'error' | string;
    error?: string;
    createdAt: string; // ISO 8601 string
}
