import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
} from './firebase';
import type { Conversation, Message, LifeInsight, InsightType } from '../types';

/**
 * Helper to validate Firestore identifier formats and prevent path traversal / injection.
 */
function isValidId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * Service for securely reading and writing to user-scoped Firestore collections.
 * UID is guaranteed to be the authenticated user's ID.
 */

export function subscribeToConversations(
  uid: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
) {
  if (!isValidId(uid)) return () => {};
  const convCol = collection(db, 'users', uid, 'conversations');
  const q = query(convCol, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'Untitled Journal',
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          preview: data.preview || '',
          messageCount: data.messageCount || 0,
          tags: data.tags || [],
        };
      });
      onUpdate(convs);
    },
    (err) => {
      console.error('[Firestore] subscribeToConversations error:', err);
      onError?.(err);
    }
  );
}

export function subscribeToMessages(
  uid: string,
  conversationId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
) {
  if (!isValidId(uid) || !isValidId(conversationId)) return () => {};
  const msgCol = collection(db, 'users', uid, 'conversations', conversationId, 'messages');
  const q = query(msgCol, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          role: data.role as 'user' | 'model',
          content: data.content || '',
          timestamp: data.timestamp || Date.now(),
          actionItems: data.actionItems || [],
        };
      });
      onUpdate(msgs);
    },
    (err) => {
      console.error('[Firestore] subscribeToMessages error:', err);
      onError?.(err);
    }
  );
}

export async function createConversation(uid: string, initialTitle = 'New Journal Entry'): Promise<string> {
  if (!isValidId(uid)) throw new Error('Valid authentication UID required to create conversation');
  const convCol = collection(db, 'users', uid, 'conversations');
  const newDocRef = doc(convCol);
  const now = Date.now();

  await setDoc(newDocRef, {
    title: initialTitle.slice(0, 200),
    createdAt: now,
    updatedAt: now,
    preview: '',
    messageCount: 0,
    tags: [],
  });

  return newDocRef.id;
}

export async function addMessage(
  uid: string,
  conversationId: string,
  role: 'user' | 'model',
  content: string,
  actionItems: string[] = []
): Promise<string> {
  if (!isValidId(uid) || !isValidId(conversationId)) {
    throw new Error('Valid UID and conversationId are required');
  }
  const msgCol = collection(db, 'users', uid, 'conversations', conversationId, 'messages');
  const newMsgRef = doc(msgCol);
  const now = Date.now();

  await setDoc(newMsgRef, {
    role,
    content,
    timestamp: now,
    actionItems,
  });

  // Update conversation parent document
  const convRef = doc(db, 'users', uid, 'conversations', conversationId);
  const preview = content.slice(0, 120).replace(/\n/g, ' ');
  await updateDoc(convRef, {
    updatedAt: now,
    preview,
  });

  return newMsgRef.id;
}

export async function updateConversationTitle(
  uid: string,
  conversationId: string,
  title: string
): Promise<void> {
  if (!isValidId(uid) || !isValidId(conversationId)) return;
  const convRef = doc(db, 'users', uid, 'conversations', conversationId);
  await updateDoc(convRef, { title: title.slice(0, 200), updatedAt: Date.now() });
}

export async function deleteConversation(uid: string, conversationId: string): Promise<void> {
  if (!isValidId(uid) || !isValidId(conversationId)) return;

  // Delete messages inside conversation subcollection
  const msgCol = collection(db, 'users', uid, 'conversations', conversationId, 'messages');
  const msgSnaps = await getDocs(msgCol);

  const batch = writeBatch(db);
  msgSnaps.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // Delete the conversation document
  const convRef = doc(db, 'users', uid, 'conversations', conversationId);
  batch.delete(convRef);

  await batch.commit();
}

// ============================================
// AI Insights Collection Management
// ============================================

export function subscribeToInsights(
  uid: string,
  onUpdate: (insights: LifeInsight[]) => void,
  onError?: (error: Error) => void
) {
  if (!isValidId(uid)) return () => {};
  const insightsCol = collection(db, 'users', uid, 'insights');
  const q = query(insightsCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LifeInsight[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type as InsightType,
          title: data.title || '',
          description: data.description || '',
          timeframe: data.timeframe,
          priority: data.priority,
          status: data.status,
          tags: data.tags || [],
          createdAt: data.createdAt || Date.now(),
          weeklyDetails: data.weeklyDetails,
        };
      });
      onUpdate(items);
    },
    (err) => {
      console.error('[Firestore] subscribeToInsights error:', err);
      onError?.(err);
    }
  );
}

export async function saveInsight(uid: string, insight: Omit<LifeInsight, 'id'>): Promise<string> {
  if (!isValidId(uid)) throw new Error('Valid authentication UID required');
  const insightsCol = collection(db, 'users', uid, 'insights');
  const newRef = doc(insightsCol);

  // Firestore rejects any undefined fields; sanitize before write
  const sanitized = Object.fromEntries(
    Object.entries(insight).filter(([_, v]) => v !== undefined)
  );

  await setDoc(newRef, {
    ...sanitized,
    createdAt: Date.now(),
  });

  return newRef.id;
}

export async function updateInsightStatus(
  uid: string,
  insightId: string,
  status: 'active' | 'in_progress' | 'completed' | 'revisit'
): Promise<void> {
  if (!isValidId(uid) || !isValidId(insightId)) return;
  const insightRef = doc(db, 'users', uid, 'insights', insightId);
  await updateDoc(insightRef, { status });
}

export async function deleteInsight(uid: string, insightId: string): Promise<void> {
  if (!isValidId(uid) || !isValidId(insightId)) return;
  const insightRef = doc(db, 'users', uid, 'insights', insightId);
  await deleteDoc(insightRef);
}

// ============================================
// Server API Handlers (Privileged Operations)
// ============================================

export async function callServerChat(
  idToken: string,
  message: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  isFirstMessage = false
): Promise<{ reply: string; actionItems: string[]; suggestedTitle?: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      message,
      history,
      isFirstMessage,
    }),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to generate response';
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

export async function callServerAnalyzeInsights(
  idToken: string,
  entries: Array<{ title: string; date: string; content: string }>
): Promise<{
  recurringTopics: Array<{ topic: string; frequency: string; description: string }>;
  goals: Array<{ title: string; description: string; timeframe: string; status: 'active' | 'in_progress' | 'completed' }>;
  actionItems: Array<{ task: string; priority: 'high' | 'medium' | 'low'; context: string }>;
  ideasToRevisit: Array<{ title: string; summary: string; potentialNextStep: string }>;
  weeklyReflection: {
    keyThemes: string[];
    whatWentWell: string[];
    growthAreas: string[];
    focusForNextWeek: string;
  };
}> {
  const res = await fetch('/api/insights/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to analyze insights';
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}
