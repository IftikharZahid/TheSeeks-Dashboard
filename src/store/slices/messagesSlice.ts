import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';

export interface SerializableMessage {
    id: string;
    groupId?: string;
    text: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    senderClass?: string;
    timestampMs: number | null;
    createdAtMs: number;
    reactions?: Record<string, any>;
    role?: string;
    isAnnouncement?: boolean;
}

interface MessagesState {
    messagesByGroup: Record<string, SerializableMessage[]>;
    isLoading: boolean;
    lastReadTimestampMs: number | null;
}

const initialState: MessagesState = {
    messagesByGroup: {},
    isLoading: true,
    lastReadTimestampMs: null,
};

const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setGroupMessages(state, action: PayloadAction<{groupId: string, messages: SerializableMessage[]}>) {
            const { groupId, messages } = action.payload;
            state.messagesByGroup[groupId] = [...messages].sort((a, b) => b.createdAtMs - a.createdAtMs);
            state.isLoading = false;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        addMessage(state, action: PayloadAction<SerializableMessage>) {
            const groupId = action.payload.groupId;
            if (!groupId) return;
            if (!state.messagesByGroup[groupId]) {
                state.messagesByGroup[groupId] = [];
            }
            if (!state.messagesByGroup[groupId].find(m => m.id === action.payload.id)) {
                state.messagesByGroup[groupId].unshift(action.payload);
                state.messagesByGroup[groupId].sort((a, b) => b.createdAtMs - a.createdAtMs);
            }
        },
        removeMessage(state, action: PayloadAction<{groupId: string, messageId: string}>) {
            const { groupId, messageId } = action.payload;
            if (state.messagesByGroup[groupId]) {
                state.messagesByGroup[groupId] = state.messagesByGroup[groupId].filter(m => m.id !== messageId);
            }
        },
        updateMessageText(state, action: PayloadAction<{groupId: string, messageId: string; text: string}>) {
            const { groupId, messageId, text } = action.payload;
            if (state.messagesByGroup[groupId]) {
                const index = state.messagesByGroup[groupId].findIndex(m => m.id === messageId);
                if (index !== -1) {
                    state.messagesByGroup[groupId][index].text = text;
                }
            }
        },
        clearMessages(state) {
            state.messagesByGroup = {};
        },
    },
});

export const { setGroupMessages, setLoading, addMessage, removeMessage, updateMessageText, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;

export const GROUPS = [
  { id:"g0_b", name:"8th — Boys",   short:"8B",  grade:"8th",  gender:"Boys",  type:"boys",  members:30 },
  { id:"g0_g", name:"8th — Girls",  short:"8G",  grade:"8th",  gender:"Girls", type:"girls", members:30 },
  { id:"g1", name:"9th — Boys",   short:"9B",  grade:"9th",  gender:"Boys",  type:"boys",  members:31 },
  { id:"g2", name:"9th — Girls",  short:"9G",  grade:"9th",  gender:"Girls", type:"girls", members:28 },
  { id:"g3", name:"10th — Boys",  short:"10B", grade:"10th", gender:"Boys",  type:"boys",  members:29 },
  { id:"g4", name:"10th — Girls", short:"10G", grade:"10th", gender:"Girls", type:"girls", members:25 },
  { id:"g5", name:"1st Year — Boys",    short:"1YB", grade:"1st Year",   gender:"Boys",  type:"boys",  members:27 },
  { id:"g6", name:"1st Year — Girls",   short:"1YG", grade:"1st Year",   gender:"Girls", type:"girls", members:22 },
  { id:"g7", name:"2nd Year — Boys",    short:"2YB", grade:"2nd Year",   gender:"Boys",  type:"boys",  members:24 },
  { id:"g8", name:"2nd Year — Girls",   short:"2YG", grade:"2nd Year",   gender:"Girls", type:"girls", members:20 },
];

export const initMessagesListener = (dispatch: any) => {
    import('../../firebase').then(({ db, auth }) => {
        import('firebase/firestore').then(({ collection, query, orderBy, onSnapshot, limit }) => {
            const unsubs: (() => void)[] = [];
            
            GROUPS.forEach(g => {
                const q = query(
                    collection(db, 'chatGroups', g.id, 'messages'), 
                    orderBy('timestamp', 'desc'), 
                    limit(50)
                );
                const unsub = onSnapshot(q, (snapshot) => {
                    // Handle deletions
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'removed') {
                            dispatch(removeMessage({ groupId: g.id, messageId: change.doc.id }));
                        }
                    });

                    const msgs: SerializableMessage[] = [];
                    snapshot.forEach((d) => {
                        const data = d.data();
                        msgs.push({
                            id: d.id,
                            groupId: g.id,
                            text: data.text,
                            senderId: data.senderId,
                            senderName: data.senderName || data.sender || 'Unknown',
                            senderPhoto: data.senderPhoto || data.avatar,
                            senderClass: data.senderClass || data.subject || '',
                            timestampMs: data.timestamp && typeof data.timestamp.toMillis === 'function' ? data.timestamp.toMillis() : (data.timestamp?.seconds ? data.timestamp.seconds * 1000 : null),
                            createdAtMs: data.timestamp && typeof data.timestamp.toMillis === 'function' ? data.timestamp.toMillis() : (data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now()),
                            reactions: data.reactions || {},
                            role: data.role || 'student',
                            isAnnouncement: data.isAnnouncement || false,
                        });
                    });
                    
                    // Replace the local Redux state completely with the authoritative Firebase snapshot
                    // This instantly purges any 'ghost' messages that were deleted in the past.
                    dispatch(setGroupMessages({ groupId: g.id, messages: msgs }));
                }, (error) => {
                    console.error(`Error listening to ${g.id} messages:`, error);
                    dispatch(setLoading(false));
                });
                unsubs.push(unsub);
            });
            
            // Note: Since this is for the dashboard, we might want to store these unsub functions somewhere,
            // but typical dashboard behavior is to keep them alive while the app is open.
            // window.unsubMessages = unsubs;
        });
    });
};

