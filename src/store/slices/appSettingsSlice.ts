import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface ExamSettings {
    categories: string[];
    titles: string[];
}

export interface UpdateNotice {
    enabled: boolean;
    version: string;
    title: string;
    message: string;
    buttonText: string;
    audience: string;
}

export interface LibraryCategory {
    name: string;
    icon: string;
}

export interface WhatsAppSettings {
    instanceId: string;
    apiToken: string;
    webhookToken: string;
}

export interface Group {
    name: string;
    books: string[];
}

const sortClasses = (classes: string[]) => {
    const getRank = (name: string) => {
        const n = name.toLowerCase().trim();
        if (n.includes('1st year') || n.includes('first year')) return 11;
        if (n.includes('2nd year') || n.includes('second year')) return 12;
        if (n.includes('3rd year') || n.includes('third year')) return 13;
        if (n.includes('4th year') || n.includes('fourth year')) return 14;
        if (n.includes('1st') || n.includes('first')) return 1;
        if (n.includes('2nd') || n.includes('second')) return 2;
        if (n.includes('3rd') || n.includes('third')) return 3;
        if (n.includes('4th') || n.includes('four')) return 4;
        if (n.includes('5th') || n.includes('five')) return 5;
        if (n.includes('6th') || n.includes('six')) return 6;
        if (n.includes('7th') || n.includes('seven')) return 7;
        if (n.includes('8th') || n.includes('eight')) return 8;
        if (n.includes('9th') || n.includes('nine')) return 9;
        if (n.includes('10th') || n.includes('ten')) return 10;
        return 999;
    };
    return [...classes].sort((a, b) => {
        const rankA = getRank(a);
        const rankB = getRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
    });
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchLibraryCategories = createAsyncThunk('appSettings/fetchLibraryCategories', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'libraryCategories'));
    const defaults: LibraryCategory[] = [
        { name: 'Video Lectures', icon: 'videocam' },
        { name: 'Documents', icon: 'document-text' },
        { name: 'Past Papers', icon: 'layers' },
        { name: 'Syllabus', icon: 'map' },
        { name: 'Quick Notes', icon: 'bulb' },
        { name: 'Audio Lectures', icon: 'headset' }
    ];
    
    let list: LibraryCategory[] = [];
    if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        list = snap.data().list.map((item: any) => {
            if (typeof item === 'string') {
                const defaultMatch = defaults.find(d => d.name === item);
                return { name: item, icon: defaultMatch ? defaultMatch.icon : 'folder' };
            }
            return item;
        });
    } else {
        list = defaults;
    }

    // Ensure all defaults are present
    const missingDefaults = defaults.filter(d => !list.some(existing => existing.name === d.name));
    if (missingDefaults.length > 0) {
        list = [...list, ...missingDefaults];
        await setDoc(doc(db, 'appSettings', 'libraryCategories'), { list });
    }
    
    return list;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.libraryCategoriesStatus === 'succeeded' || appSettings.libraryCategoriesStatus === 'loading') return false;
    }
});

export const persistLibraryCategories = createAsyncThunk('appSettings/persistLibraryCategories', async (list: LibraryCategory[]) => {
    await setDoc(doc(db, 'appSettings', 'libraryCategories'), { list });
    return list;
});

export const fetchWhatsAppSettings = createAsyncThunk('appSettings/fetchWhatsAppSettings', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'whatsappSettings'));
    if (snap.exists() && snap.data()) {
        return snap.data() as WhatsAppSettings;
    }
    return { instanceId: '', apiToken: '', webhookToken: '' };
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.whatsappSettingsStatus === 'succeeded' || appSettings.whatsappSettingsStatus === 'loading') return false;
    }
});

export const persistWhatsAppSettings = createAsyncThunk('appSettings/persistWhatsAppSettings', async (settings: WhatsAppSettings) => {
    await setDoc(doc(db, 'appSettings', 'whatsappSettings'), settings);
    return settings;
});

export const fetchBooks = createAsyncThunk('appSettings/fetchBooks', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'books'));
    if (snap.exists() && snap.data().list) return snap.data().list as string[];
    const defaults = [
        'TarjumaTul Quran', 'Urdu', 'Pak Study', 'English', 'Computer Science',
        'Mathematics', 'Physics', 'Sociology', 'Psychology', 'Economics',
        'Ethics', 'Chemistry', 'Biology',
    ];
    await setDoc(doc(db, 'appSettings', 'books'), { list: defaults });
    return defaults;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.booksStatus === 'succeeded' || appSettings.booksStatus === 'loading') return false;
    }
});

export const fetchGroups = createAsyncThunk('appSettings/fetchGroups', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'groups'));
    const defaults: Group[] = [
        { name: 'F.Sc Medical', books: [] },
        { name: 'F.Sc Pre', books: [] },
        { name: 'ICS', books: [] },
        { name: 'FA.IT', books: [] },
        { name: 'FA', books: [] }
    ];

    let list: Group[] = [];
    if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        list = snap.data().list.map((item: any) => {
            if (typeof item === 'string') {
                return { name: item, books: [] };
            }
            return item;
        });
        return list;
    }
    
    await setDoc(doc(db, 'appSettings', 'groups'), { list: defaults });
    return defaults;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.groupsStatus === 'succeeded' || appSettings.groupsStatus === 'loading') return false;
    }
});

export const fetchClasses = createAsyncThunk('appSettings/fetchClasses', async () => {
    const FIRESTORE_KEY = 'classes';
    const LS_KEY = 'school_saved_classes';
    const REAL_DEFAULTS = ['9th', '10th', '1st Year', '2nd Year'];

    // 1. Try Firestore first
    const snap = await getDoc(doc(db, 'appSettings', FIRESTORE_KEY));
    if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        return snap.data().list as string[];
    }

    // 2. Firestore empty — try to migrate from ExamsPage's old localStorage store
    let migrated: string[] = [];
    try {
        const lsRaw = localStorage.getItem(LS_KEY);
        if (lsRaw) {
            const parsed = JSON.parse(lsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                migrated = parsed;
            }
        }
    } catch (_) { /* ignore */ }

    const toSave = migrated.length > 0 ? migrated : REAL_DEFAULTS;

    // 3. Write to Firestore so Settings page owns it from now on
    await setDoc(doc(db, 'appSettings', FIRESTORE_KEY), { list: toSave });

    // 4. Clean up localStorage — Firestore is now the source of truth
    try { localStorage.removeItem(LS_KEY); } catch (_) { /* ignore */ }

    return toSave;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.classesStatus === 'succeeded' || appSettings.classesStatus === 'loading') return false;
    }
});

export const persistBooks = createAsyncThunk('appSettings/persistBooks', async (list: string[]) => {
    await setDoc(doc(db, 'appSettings', 'books'), { list });
    return list;
});

export const persistGroups = createAsyncThunk('appSettings/persistGroups', async (list: Group[]) => {
    await setDoc(doc(db, 'appSettings', 'groups'), { list });
    return list;
});

export const persistClasses = createAsyncThunk('appSettings/persistClasses', async (list: string[]) => {
    await setDoc(doc(db, 'appSettings', 'classes'), { list });
    return list;
});


export const fetchSessions = createAsyncThunk('appSettings/fetchSessions', async () => {
    const FIRESTORE_KEY = 'sessions';
    const REAL_DEFAULTS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];

    const snap = await getDoc(doc(db, 'appSettings', FIRESTORE_KEY));
    if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        return snap.data().list as string[];
    }
    return REAL_DEFAULTS;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.sessionsStatus === 'succeeded' || appSettings.sessionsStatus === 'loading') return false;
    }
});

export const persistSessions = createAsyncThunk('appSettings/persistSessions', async (list: string[]) => {
    await setDoc(doc(db, 'appSettings', 'sessions'), { list });
    return list;
});

export const fetchDefaultFees = createAsyncThunk('appSettings/fetchDefaultFees', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'defaultFees'));
    if (snap.exists() && snap.data().fees) return snap.data().fees as Record<string, number>;
    return {} as Record<string, number>;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.defaultFeesStatus === 'succeeded' || appSettings.defaultFeesStatus === 'loading') return false;
    }
});

export const persistDefaultFees = createAsyncThunk('appSettings/persistDefaultFees', async (fees: Record<string, number>) => {
    await setDoc(doc(db, 'appSettings', 'defaultFees'), { fees });
    return fees;
});

export const fetchExamSettings = createAsyncThunk('appSettings/fetchExamSettings', async () => {
    const FIRESTORE_KEY = 'examSettings';
    const LS_CAT_KEY = 'school_saved_categories';
    const LS_TITLE_KEY = 'school_saved_titles';
    const DEFAULT_CATEGORIES = ['Weekly', 'Monthly', 'Quarterly', 'Half Book', 'Full Book'];
    const DEFAULT_TITLES = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);

    let settings: ExamSettings = { categories: DEFAULT_CATEGORIES, titles: DEFAULT_TITLES };

    // 1. Try Firestore first
    const snap = await getDoc(doc(db, 'appSettings', FIRESTORE_KEY));
    if (snap.exists() && snap.data().categories && snap.data().titles) {
        return snap.data() as ExamSettings;
    }

    // 2. Fallback to localStorage migration
    try {
        const lsCats = localStorage.getItem(LS_CAT_KEY);
        if (lsCats) {
            const parsed = JSON.parse(lsCats);
            if (Array.isArray(parsed) && parsed.length > 0) settings.categories = parsed;
        }
        const lsTitles = localStorage.getItem(LS_TITLE_KEY);
        if (lsTitles) {
            const parsed = JSON.parse(lsTitles);
            if (Array.isArray(parsed) && parsed.length > 0) settings.titles = parsed;
        }
    } catch (e) { /* ignore */ }

    // 3. Save to Firestore
    await setDoc(doc(db, 'appSettings', FIRESTORE_KEY), settings);

    // 4. Cleanup localStorage
    try {
        localStorage.removeItem(LS_CAT_KEY);
        localStorage.removeItem(LS_TITLE_KEY);
    } catch (e) { /* ignore */ }

    return settings;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.examSettingsStatus === 'succeeded' || appSettings.examSettingsStatus === 'loading') return false;
    }
});

export const persistExamSettings = createAsyncThunk('appSettings/persistExamSettings', async (settings: ExamSettings) => {
    await setDoc(doc(db, 'appSettings', 'examSettings'), settings);
    return settings;
});

export const fetchUpdateNotice = createAsyncThunk('appSettings/fetchUpdateNotice', async () => {
    const snap = await getDoc(doc(db, 'appSettings', 'updateNotice'));
    if (snap.exists() && snap.data()) {
        return snap.data() as UpdateNotice;
    }
    return { enabled: false, version: '1.0.0', title: 'App Update Notice', message: '', buttonText: 'Got it', audience: 'All' } as UpdateNotice;
}, {
    condition: (_, { getState }: any) => {
        const { appSettings } = getState();
        if (appSettings.updateNoticeStatus === 'succeeded' || appSettings.updateNoticeStatus === 'loading') return false;
    }
});

export const persistUpdateNotice = createAsyncThunk('appSettings/persistUpdateNotice', async (notice: UpdateNotice) => {
    await setDoc(doc(db, 'appSettings', 'updateNotice'), notice);
    return notice;
});

// ── Slice ─────────────────────────────────────────────────────────────────────

interface AppSettingsState {
    books: string[];
    booksStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    classes: string[];
    classesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    sessions: string[];
    sessionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    groups: Group[];
    groupsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    defaultFees: Record<string, number>;
    defaultFeesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    examCategories: string[];
    examTitles: string[];
    examSettingsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    libraryCategories: LibraryCategory[];
    libraryCategoriesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    whatsappSettings: WhatsAppSettings;
    whatsappSettingsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    updateNotice: UpdateNotice;
    updateNoticeStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AppSettingsState = {
    books: [],
    booksStatus: 'idle',
    classes: [],
    classesStatus: 'idle',
    sessions: [],
    sessionsStatus: 'idle',
    groups: [],
    groupsStatus: 'idle',
    defaultFees: {},
    defaultFeesStatus: 'idle',
    examCategories: [],
    examTitles: [],
    examSettingsStatus: 'idle',
    libraryCategories: [],
    libraryCategoriesStatus: 'idle',
    whatsappSettings: { instanceId: '', apiToken: '', webhookToken: '' },
    whatsappSettingsStatus: 'idle',
    updateNotice: { enabled: false, version: '1.0.0', title: 'App Update Notice', message: '', buttonText: 'Got it', audience: 'All' },
    updateNoticeStatus: 'idle',
};

const appSettingsSlice = createSlice({
    name: 'appSettings',
    initialState,
    reducers: {
        setBooks: (state, action: PayloadAction<string[]>) => { state.books = action.payload; },
        setClasses: (state, action: PayloadAction<string[]>) => { state.classes = sortClasses(action.payload); },
        setSessions: (state, action: PayloadAction<string[]>) => { state.sessions = action.payload; },
        setGroups: (state, action: PayloadAction<Group[]>) => { state.groups = action.payload; },
        setDefaultFees: (state, action: PayloadAction<Record<string, number>>) => { state.defaultFees = action.payload; },
        setLibraryCategories: (state, action: PayloadAction<LibraryCategory[]>) => { state.libraryCategories = action.payload; },
        resetStatus: (state) => {
            state.booksStatus = 'idle';
            state.classesStatus = 'idle';
            state.sessionsStatus = 'idle';
            state.groupsStatus = 'idle';
            state.defaultFeesStatus = 'idle';
            state.examSettingsStatus = 'idle';
            state.libraryCategoriesStatus = 'idle';
            state.updateNoticeStatus = 'idle';
        },
    },
    extraReducers: (builder) => {
        builder
            // Books
            .addCase(fetchBooks.pending, (state) => { state.booksStatus = 'loading'; })
            .addCase(fetchBooks.fulfilled, (state, action) => { state.booksStatus = 'succeeded'; state.books = action.payload; })
            .addCase(fetchBooks.rejected, (state) => { state.booksStatus = 'failed'; })
            // Classes
            .addCase(fetchClasses.pending, (state) => { state.classesStatus = 'loading'; })
            .addCase(fetchClasses.fulfilled, (state, action) => { state.classesStatus = 'succeeded'; state.classes = sortClasses(action.payload); })
            .addCase(fetchClasses.rejected, (state) => { state.classesStatus = 'failed'; })
            // Sessions
            .addCase(fetchSessions.pending, (state) => { state.sessionsStatus = 'loading'; })
            .addCase(fetchSessions.fulfilled, (state, action) => { state.sessionsStatus = 'succeeded'; state.sessions = action.payload; })
            .addCase(fetchSessions.rejected, (state) => { state.sessionsStatus = 'failed'; })
            // Groups
            .addCase(fetchGroups.pending, (state) => { state.groupsStatus = 'loading'; })
            .addCase(fetchGroups.fulfilled, (state, action) => { state.groupsStatus = 'succeeded'; state.groups = action.payload; })
            .addCase(fetchGroups.rejected, (state) => { state.groupsStatus = 'failed'; })
            // Default Fees
            .addCase(fetchDefaultFees.pending, (state) => { state.defaultFeesStatus = 'loading'; })
            .addCase(fetchDefaultFees.fulfilled, (state, action) => { state.defaultFeesStatus = 'succeeded'; state.defaultFees = action.payload; })
            .addCase(fetchDefaultFees.rejected, (state) => { state.defaultFeesStatus = 'failed'; })
            // Exam Settings
            .addCase(fetchExamSettings.pending, (state) => { state.examSettingsStatus = 'loading'; })
            .addCase(fetchExamSettings.fulfilled, (state, action) => { 
                state.examSettingsStatus = 'succeeded'; 
                state.examCategories = action.payload.categories;
                state.examTitles = action.payload.titles;
            })
            .addCase(fetchExamSettings.rejected, (state) => { state.examSettingsStatus = 'failed'; })
            // Persist Books
            .addCase(persistBooks.fulfilled, (state, action) => { state.books = action.payload; })
            // Persist Classes
            .addCase(persistClasses.fulfilled, (state, action) => { state.classes = sortClasses(action.payload); })
            // Persist Sessions
            .addCase(persistSessions.fulfilled, (state, action) => { state.sessions = action.payload; })
            // Persist Groups
            .addCase(persistGroups.fulfilled, (state, action) => { state.groups = action.payload; })
            // Persist Default Fees
            .addCase(persistDefaultFees.fulfilled, (state, action) => { state.defaultFees = action.payload; })
            // Persist Exam Settings
            .addCase(persistExamSettings.fulfilled, (state, action) => {
                state.examCategories = action.payload.categories;
                state.examTitles = action.payload.titles;
            })
            // Library Categories
            .addCase(fetchLibraryCategories.pending, (state) => { state.libraryCategoriesStatus = 'loading'; })
            .addCase(fetchLibraryCategories.fulfilled, (state, action) => { state.libraryCategoriesStatus = 'succeeded'; state.libraryCategories = action.payload; })
            .addCase(fetchLibraryCategories.rejected, (state) => { state.libraryCategoriesStatus = 'failed'; })
            .addCase(persistLibraryCategories.fulfilled, (state, action) => { state.libraryCategories = action.payload; })
            // WhatsApp Settings
            .addCase(fetchWhatsAppSettings.pending, (state) => { state.whatsappSettingsStatus = 'loading'; })
            .addCase(fetchWhatsAppSettings.fulfilled, (state, action) => { state.whatsappSettingsStatus = 'succeeded'; state.whatsappSettings = action.payload; })
            .addCase(fetchWhatsAppSettings.rejected, (state) => { state.whatsappSettingsStatus = 'failed'; })
            .addCase(persistWhatsAppSettings.fulfilled, (state, action) => { state.whatsappSettings = action.payload; })
            // Update Notice
            .addCase(fetchUpdateNotice.pending, (state) => { state.updateNoticeStatus = 'loading'; })
            .addCase(fetchUpdateNotice.fulfilled, (state, action) => { state.updateNoticeStatus = 'succeeded'; state.updateNotice = action.payload; })
            .addCase(fetchUpdateNotice.rejected, (state) => { state.updateNoticeStatus = 'failed'; })
            .addCase(persistUpdateNotice.fulfilled, (state, action) => { state.updateNotice = action.payload; });
    },
});

export const { setBooks, setClasses, setGroups, setDefaultFees, setLibraryCategories, resetStatus } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;
