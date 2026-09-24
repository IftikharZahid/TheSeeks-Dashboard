export interface NotificationAnalytics {
    total: number;
    delivered: number;
    failed: number;
    read: number;
    opened: number;
    scheduled?: number;
    drafts?: number;
    ctr?: number;
    engagement?: number;
    activeUsers?: number;
    deviceTypes?: { android: number; ios: number; web: number };
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
}

export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type NotificationType = 'Announcement' | 'Diary' | 'Assignment' | 'Exam' | 'Attendance' | 'Timetable' | 'E-library' | 'Library' | 'Results' | 'Fee reminder' | 'Chat' | 'Holiday' | 'Events' | 'Emergency' | 'Custom';
export type DeliveryMode = 'Push Notification' | 'In-App Notification' | 'Both';
export type Audience = 'All Users' | 'All Students' | 'All Teachers' | 'Parents' | 'Specific Class' | 'Section' | 'Group' | 'Individual Student' | 'Individual Teacher' | 'Multiple Selection';

export interface Notification {
    id: string;
    title: string;
    subject?: string;
    description: string;
    imageUrl?: string;
    pdfUrl?: string;
    videoLink?: string;
    audience: Audience;
    instituteId?: string;
    classId?: string;
    sectionId?: string;
    targetId?: string; // used for Group, Individual Student, Individual Teacher
    deepLinkScreen?: string; // route/screen to open when tapped
    priority: NotificationPriority;
    type: NotificationType;
    deliveryMode: DeliveryMode;
    published: boolean;
    scheduledAt?: string | null; // ISO String or null
    expiryDate?: string | null; // ISO String or null
    createdAt: any; // Firebase Timestamp
    createdBy: string;
    updatedAt: any; // Firebase Timestamp
    deliveryTracking?: {
        delivered: number;
        failed: number;
        read: number;
        opened: number;
    };
}
