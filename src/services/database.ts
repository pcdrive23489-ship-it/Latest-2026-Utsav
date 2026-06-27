
import { supabase } from '@/lib/supabase';
import type {
    UserProfile, FestivalEvent, DonationTransparency, CollectionEntry,
    FinanceData, ChatMessage, Countdown, DonationRecord, DevotionalSong,
    Announcement, RangoliEntry, RangoliCompetitionData, StorageCleanupLog
} from '@/lib/types';
import { uploadFile } from './storage';

// Helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- USERS ---
// Profile rows are created server-side by the public.handle_new_user() trigger
// (see supabase_security.sql) so role/status can't be set by the client. There
// is intentionally no client-side createUserProfile.

export const getUserProfile = async (uid: string, retries = 3): Promise<UserProfile | null> => {
    try {
        const { data, error } = await supabase.from('users').select('*').eq('uid', uid).single();
        if (error) {
            if (error.code === 'PGRST116' && retries > 0) {
                await delay(500);
                return getUserProfile(uid, retries - 1);
            }
            return null;
        }
        if (!data) return null;
        return mapUserRow(data);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        if (retries > 0) {
            await delay(500);
            return getUserProfile(uid, retries - 1);
        }
        return null;
    }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    const update: Record<string, unknown> = {};
    if (data.firstName !== undefined) update.first_name = data.firstName;
    if (data.lastName !== undefined) update.last_name = data.lastName;
    if (data.email !== undefined) update.email = data.email;
    if (data.role !== undefined) update.role = data.role;
    if (data.status !== undefined) update.status = data.status;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.location !== undefined) update.location = data.location;
    if (data.website !== undefined) update.website = data.website;
    if (data.photoURL !== undefined) update.photo_url = data.photoURL;

    const { error } = await supabase.from('users').update(update).eq('uid', uid);
    if (error) throw error;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return (data || []).map(mapUserRow);
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
};

export const updateUserStatus = async (uid: string, status: UserProfile['status']) => {
    const { error } = await supabase.from('users').update({ status }).eq('uid', uid);
    if (error) throw error;
};

function mapUserRow(row: Record<string, unknown>): UserProfile {
    return {
        uid: row.uid as string,
        email: row.email as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        role: row.role as UserProfile['role'],
        status: row.status as UserProfile['status'],
        createdAt: row.created_at as string,
        bio: row.bio as string | undefined,
        location: row.location as string | undefined,
        website: row.website as string | undefined,
        photoURL: row.photo_url as string | undefined,
    };
}

// --- EVENTS ---

export const getEvents = async (): Promise<FestivalEvent[]> => {
    try {
        const { data, error } = await supabase.from('events').select('*');
        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            title: r.title,
            date: r.date,
            time: r.time,
            description: r.description,
        }));
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
};

export const saveEvent = async (event: Omit<FestivalEvent, 'id'>, id?: string): Promise<void> => {
    if (id) {
        const { error } = await supabase.from('events').update(event).eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('events').insert(event);
        if (error) throw error;
    }
};

export const deleteEvent = async (id: string): Promise<void> => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
};

// --- ANNOUNCEMENTS ---

export const getAnnouncements = async (): Promise<Announcement[]> => {
    try {
        const { data, error } = await supabase.from('announcements').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
            // Seed initial data
            const initialData = [
                { title: 'Evening Aarti', content: 'The evening aarti will begin at 7:00 PM today at the main stage. All are welcome to join.' },
                { title: 'Prasad Distribution', content: 'Prasad will be distributed near the exit gate from 8:00 PM onwards. Please form a queue.' },
                { title: 'Cultural Program Schedule Change', content: 'The dance performance originally scheduled for 6:00 PM has been moved to 8:30 PM.' },
            ];
            const { data: seeded, error: seedError } = await supabase.from('announcements').insert(initialData).select();
            if (seedError) throw seedError;
            return (seeded || []).map(r => ({ id: r.id, title: r.title, content: r.content }));
        }
        return data.map(r => ({ id: r.id, title: r.title, content: r.content }));
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return [];
    }
};

export const saveAnnouncement = async (announcement: Omit<Announcement, 'id'>, id?: string): Promise<void> => {
    if (id) {
        const { error } = await supabase.from('announcements').update(announcement).eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('announcements').insert(announcement);
        if (error) throw error;
    }
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
};

// --- DONATIONS & TRANSPARENCY ---

export const saveDonationTransparency = async (settings: DonationTransparency): Promise<void> => {
    const row = {
        id: 'donations',
        decoration: settings.decoration,
        prasad: settings.prasad,
        programs: settings.programs,
        logistics: settings.logistics,
        qr_code_url: settings.qrCodeUrl,
        upi_id: settings.upiId,
    };
    const { error } = await supabase.from('settings').upsert(row, { onConflict: 'id' });
    if (error) throw error;
};

export const getDonationTransparency = async (): Promise<DonationTransparency> => {
    try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 'donations').single();
        if (error || !data) throw error;
        return {
            decoration: data.decoration,
            prasad: data.prasad,
            programs: data.programs,
            logistics: data.logistics,
            qrCodeUrl: data.qr_code_url,
            upiId: data.upi_id,
        };
    } catch {
        return { decoration: 40, prasad: 30, programs: 20, logistics: 10, qrCodeUrl: '', upiId: '' };
    }
};

export const addDonationRecord = async (record: Omit<DonationRecord, 'id' | 'createdAt' | 'status'>): Promise<void> => {
    const { error } = await supabase.from('donations_log').insert({
        donor_name: record.donorName,
        amount: record.amount,
        purpose: record.purpose,
        proof_image_url: record.proofImageUrl,
        status: 'pending',
    });
    if (error) throw error;
};

export const getDonationRecords = async (): Promise<DonationRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('donations_log')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            donorName: r.donor_name,
            amount: r.amount,
            purpose: r.purpose,
            proofImageUrl: r.proof_image_url,
            status: r.status,
            createdAt: r.created_at,
        }));
    } catch (error) {
        console.error('Error fetching donation records:', error);
        return [];
    }
};

export const updateDonationStatus = async (id: string, status: 'pending' | 'verified'): Promise<void> => {
    const { error } = await supabase.from('donations_log').update({ status }).eq('id', id);
    if (error) throw error;
};

export const saveFinanceVisibility = async (isVisible: boolean): Promise<void> => {
    const { error } = await supabase.from('settings').upsert({ id: 'finance', visible_to_members: isVisible }, { onConflict: 'id' });
    if (error) throw error;
};

export const getFinanceVisibility = async (): Promise<boolean> => {
    try {
        const { data, error } = await supabase.from('settings').select('visible_to_members').eq('id', 'finance').single();
        if (error || !data) return false;
        return data.visible_to_members || false;
    } catch {
        return false;
    }
};

// --- COLLECTIONS ---

export const getCollections = async (): Promise<CollectionEntry[]> => {
    try {
        const { data, error } = await supabase.from('collections').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
            // Seed initial data
            const initialData = [
                { section: 'A Wing', name: 'Ramesh Gupta', date: '2024-09-08', expected: 5000, received: 5000, status: 'Paid' },
                { section: 'A Wing', name: 'Sita Desai', date: '2024-09-08', expected: 2500, received: 2500, status: 'Paid' },
                { section: 'B Wing', name: 'Vikram Singh', date: '2024-09-09', expected: 10000, received: 0, status: 'Pending' },
            ];
            const { data: seeded, error: seedError } = await supabase.from('collections').insert(initialData).select();
            if (seedError) throw seedError;
            return (seeded || []).map(mapCollectionRow);
        }
        return data.map(mapCollectionRow);
    } catch (error) {
        console.error('Error fetching collections:', error);
        return [];
    }
};

export const saveCollection = async (entry: Omit<CollectionEntry, 'id'>, id?: string): Promise<void> => {
    if (id) {
        const { error } = await supabase.from('collections').update(entry).eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('collections').insert(entry);
        if (error) throw error;
    }
};

export const deleteCollection = async (id: string): Promise<void> => {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw error;
};

export const updateCollectionSectionName = async (oldName: string, newName: string): Promise<void> => {
    const { error } = await supabase.from('collections').update({ section: newName }).eq('section', oldName);
    if (error) throw error;
};

export const overwriteCollections = async (entries: Omit<CollectionEntry, 'id'>[]): Promise<void> => {
    const { error: delError } = await supabase.from('collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) throw delError;
    if (entries.length > 0) {
        const { error } = await supabase.from('collections').insert(entries);
        if (error) throw error;
    }
};

function mapCollectionRow(r: Record<string, unknown>): CollectionEntry {
    return {
        id: r.id as string,
        section: r.section as string,
        name: r.name as string,
        date: r.date as string,
        expected: r.expected as number,
        received: r.received as number,
        status: r.status as 'Paid' | 'Pending',
    };
}

// --- FINANCE DATA ---

const defaultFinanceData: FinanceData = {
    assets: [
        { item: 'Cash in Hand', amount: 50000 },
        { item: 'Bank Balance', amount: 250000 },
        { item: 'Receivables (Pending Collections)', amount: 25000 },
    ],
    liabilities: [
        { item: 'Advance from Sponsors', amount: 100000 },
        { item: 'Unpaid Vendor Bills', amount: 45000 },
    ],
    income: [
        { item: 'Donations', amount: 250000 },
        { item: 'Sponsorships', amount: 100000 },
    ],
    expenses: [
        { item: 'Mandap Decoration', amount: 80000 },
        { item: 'Prasad & Bhog', amount: 60000 },
        { item: 'Cultural Programs', amount: 45000 },
        { item: 'Logistics', amount: 20000 },
    ],
};

export const getFinanceData = async (): Promise<FinanceData> => {
    try {
        const { data, error } = await supabase.from('settings').select('finance_data').eq('id', 'finance_data').single();
        if (error || !data) throw error;
        return data.finance_data as FinanceData;
    } catch {
        // Seed default
        await supabase.from('settings').upsert({ id: 'finance_data', finance_data: defaultFinanceData }, { onConflict: 'id' });
        return defaultFinanceData;
    }
};

export const saveFinanceData = async (data: FinanceData): Promise<void> => {
    const { error } = await supabase.from('settings').upsert({ id: 'finance_data', finance_data: data }, { onConflict: 'id' });
    if (error) throw error;
};

// --- CHAT ---

const CHAT_ID = 'global_chat';

export const getChatMessages = (callback: (messages: ChatMessage[]) => void) => {
    // Initial fetch
    (async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', CHAT_ID)
                .order('created_at', { ascending: true })
                .limit(50);
            if (error) throw error;
            const messages = (data || [])
                .filter((r: Record<string, unknown>) => r.text !== 'This message was deleted.')
                .map(mapMessageRow);
            callback(messages);
        } catch (err: any) {
            console.error('Error fetching chat messages:', err);
            callback([]);
        }
    })();

    // Subscribe to realtime changes
    let channel: any;
    try {
        channel = supabase
            .channel(`chat:${CHAT_ID}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${CHAT_ID}` },
                async () => {
                    const { data } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('chat_id', CHAT_ID)
                        .order('created_at', { ascending: true })
                        .limit(50);
                    const messages = (data || [])
                        .filter((r: Record<string, unknown>) => r.text !== 'This message was deleted.')
                        .map(mapMessageRow);
                    callback(messages);
                }
            )
            .subscribe();
    } catch (e) {
        console.error('Realtime chat channel error:', e);
    }

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
};

export const sendTextMessage = async (payload: Partial<ChatMessage>): Promise<void> => {
    const { error } = await supabase.from('messages').insert({
        chat_id: CHAT_ID,
        sender_id: payload.senderId,
        user_name: payload.userName,
        user_avatar: payload.userAvatar,
        text: payload.text,
        type: 'text',
        media_url: null,
        reply_to: payload.replyTo || null,
        reply_to_content: payload.replyToContent || null,
        is_seen: false,
    });
    if (error) throw error;
};

export const sendMediaMessage = async (
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    file: File
): Promise<void> => {
    const mediaUrl = await uploadFile(file, `chat_media/${CHAT_ID}/${Date.now()}_${file.name}`);

    let type: ChatMessage['type'] = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    if (file.type.startsWith('audio/')) type = 'audio';

    const { error } = await supabase.from('messages').insert({
        chat_id: CHAT_ID,
        sender_id: userId,
        user_name: userName,
        user_avatar: userAvatar || '',
        text: '',
        media_url: mediaUrl,
        type,
        file_name: file.name,
        is_seen: false,
    });
    if (error) throw error;
};

export const editMessage = async (messageId: string, newText: string): Promise<void> => {
    const { error } = await supabase.from('messages').update({ text: newText, is_edited: true }).eq('id', messageId);
    if (error) throw error;
};

export const deleteMessage = async (messageId: string): Promise<void> => {
    const { error } = await supabase.from('messages').update({
        text: 'This message was deleted.',
        reactions: {},
        media_url: null,
        type: 'text',
    }).eq('id', messageId);
    if (error) throw error;
};

export const toggleReaction = async (messageId: string, emoji: string, _userId?: string) => {
    // Reactions on any message are toggled via a SECURITY DEFINER RPC keyed on
    // auth.uid(), so clients don't need broad UPDATE access to others' messages.
    const { error } = await supabase.rpc('toggle_message_reaction', {
        message_id: messageId,
        emoji,
    });
    if (error) throw error;
};

function mapMessageRow(r: Record<string, unknown>): ChatMessage {
    return {
        id: r.id as string,
        senderId: r.sender_id as string,
        text: r.text as string,
        mediaUrl: r.media_url as string | null,
        type: r.type as ChatMessage['type'],
        createdAt: r.created_at as string,
        isSeen: r.is_seen as boolean,
        replyTo: r.reply_to as string | null,
        replyToContent: r.reply_to_content as ChatMessage['replyToContent'],
        reactions: r.reactions as ChatMessage['reactions'],
        isEdited: r.is_edited as boolean | undefined,
        userName: r.user_name as string | undefined,
        userAvatar: r.user_avatar as string | undefined,
        fileName: r.file_name as string | undefined,
    };
}

// --- COUNTDOWNS ---

export const getCountdowns = async (): Promise<Countdown[]> => {
    try {
        const { data, error } = await supabase.from('countdowns').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
            const pranaDate = new Date();
            pranaDate.setDate(pranaDate.getDate() + 10);
            const defaultCountdown = { name: 'Prana Pratishthapana', target_date: pranaDate.toISOString() };
            const { data: seeded, error: seedError } = await supabase.from('countdowns').insert(defaultCountdown).select();
            if (seedError) throw seedError;
            return (seeded || []).map(r => ({ id: r.id, name: r.name, targetDate: r.target_date }));
        }
        return data.map(r => ({ id: r.id, name: r.name, targetDate: r.target_date }));
    } catch (error) {
        console.error('Error fetching countdowns:', error);
        return [];
    }
};

export const saveCountdown = async (countdown: Omit<Countdown, 'id'>, id?: string): Promise<void> => {
    const row = { name: countdown.name, target_date: countdown.targetDate };
    if (id) {
        const { error } = await supabase.from('countdowns').update(row).eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('countdowns').insert(row);
        if (error) throw error;
    }
};

export const deleteCountdown = async (id: string): Promise<void> => {
    const { error } = await supabase.from('countdowns').delete().eq('id', id);
    if (error) throw error;
};

// --- DEVOTIONAL SONGS ---

export const getDevotionalSongs = async (): Promise<DevotionalSong[]> => {
    try {
        const { data, error } = await supabase.from('devotional_songs').select('*').order('title', { ascending: true });
        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            title: r.title,
            link: r.link,
            addedBy: r.added_by,
            userId: r.user_id,
        }));
    } catch (error) {
        console.error('Error fetching devotional songs:', error);
        return [];
    }
};

export const addDevotionalSong = async (song: Omit<DevotionalSong, 'id'>): Promise<void> => {
    const { error } = await supabase.from('devotional_songs').insert({
        title: song.title,
        link: song.link,
        added_by: song.addedBy,
        user_id: song.userId,
    });
    if (error) throw error;
};

export const deleteDevotionalSong = async (id: string): Promise<void> => {
    const { error } = await supabase.from('devotional_songs').delete().eq('id', id);
    if (error) throw error;
};

// --- LIVE STREAM ---

export const setLiveStreamStatus = async (isLive: boolean): Promise<void> => {
    const { error } = await supabase.from('settings').upsert({ id: 'live_stream', is_live: isLive }, { onConflict: 'id' });
    if (error) throw error;
};

export const onLiveStreamStatusChange = (callback: (status: { isLive: boolean }) => void) => {
    // Initial fetch
    (async () => {
        try {
            const { data, error } = await supabase.from('settings').select('is_live').eq('id', 'live_stream').single();
            if (error && error.code !== 'PGRST116') throw error; // Ignore row not found
            callback({ isLive: data?.is_live || false });
        } catch (err: any) {
            console.error('Error fetching live stream status:', err);
            callback({ isLive: false });
        }
    })();

    let channel: any;
    try {
        channel = supabase
            .channel('live_stream_status')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.live_stream' },
                (payload) => {
                    const record = payload.new as Record<string, unknown>;
                    callback({ isLive: (record?.is_live as boolean) || false });
                }
            )
            .subscribe((status, error) => {
                if (error) console.error('Realtime live stream error:', error);
            });
    } catch (e) {
        console.error('Realtime live stream create block error:', e);
    }

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
};

// --- RANGOLI COMPETITION ---

export const getRangoliEntries = async (): Promise<RangoliEntry[]> => {
    try {
        const { data, error } = await supabase.from('rangoli_entries').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
            const defaultEntries = [
                { artist_name: 'The Creative Crew', image_url: 'https://picsum.photos/600/600?random=1', artist_image_url: 'https://picsum.photos/100/100?random=a', votes: 128, description: 'A vibrant depiction of Lord Ganesha.' },
                { artist_name: 'Artistic Angels', image_url: 'https://picsum.photos/600/600?random=2', artist_image_url: 'https://picsum.photos/100/100?random=b', votes: 95, description: 'Modern take on a classic design.' },
                { artist_name: 'Colors of Joy', image_url: 'https://picsum.photos/600/600?random=3', artist_image_url: 'https://picsum.photos/100/100?random=c', votes: 210, description: "Inspired by nature's patterns." },
            ];
            const { data: seeded, error: seedError } = await supabase.from('rangoli_entries').insert(defaultEntries).select();
            if (seedError) throw seedError;
            return (seeded || []).map(mapRangoliRow);
        }
        return data.map(mapRangoliRow);
    } catch (error) {
        console.error('Error fetching rangoli entries:', error);
        return [];
    }
};

export const getUserRangoliVote = async (userId: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase.from('user_votes').select('rangoli_entry_id').eq('user_id', userId).single();
        if (error || !data) return null;
        return data.rangoli_entry_id || null;
    } catch {
        return null;
    }
};

export const voteForRangoli = async (entryId: string, _userId?: string): Promise<void> => {
    // One vote per user, enforced atomically server-side via SECURITY DEFINER RPC
    // keyed on auth.uid(). Also handles switching an existing vote.
    const { error } = await supabase.rpc('cast_rangoli_vote', { entry_id: entryId });
    if (error) throw error;
};

export const revoteForRangoli = async (newEntryId: string, _oldEntryId?: string, _userId?: string): Promise<void> => {
    // cast_rangoli_vote() moves the vote when one already exists, so the same RPC
    // covers both first-time votes and re-votes.
    const { error } = await supabase.rpc('cast_rangoli_vote', { entry_id: newEntryId });
    if (error) throw error;
};

export const saveRangoliEntry = async (entry: Partial<Omit<RangoliEntry, 'id' | 'votes'>>, id?: string): Promise<void> => {
    const row: Record<string, unknown> = {};
    if (entry.artistName !== undefined) row.artist_name = entry.artistName;
    if (entry.imageUrl !== undefined) row.image_url = entry.imageUrl;
    if (entry.artistImageUrl !== undefined) row.artist_image_url = entry.artistImageUrl;
    if (entry.description !== undefined) row.description = entry.description;

    if (id) {
        const { error } = await supabase.from('rangoli_entries').update(row).eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('rangoli_entries').insert({ ...row, votes: 0 });
        if (error) throw error;
    }
};

export const deleteRangoliEntry = async (id: string): Promise<void> => {
    const { error } = await supabase.from('rangoli_entries').delete().eq('id', id);
    if (error) throw error;
};

const defaultPrizeData: RangoliCompetitionData = {
    prizes: [
        { rank: '1st Place', prize: 'Gift Hamper & Trophy' },
        { rank: '2nd Place', prize: 'Gift Voucher & Medal' },
        { rank: '3rd Place', prize: 'Certificate & Medal' },
    ],
    announcementDate: 'September 17th, 2024',
    criteria: 'Highest number of public votes.',
};

export const getRangoliPrizes = async (): Promise<RangoliCompetitionData> => {
    try {
        const { data, error } = await supabase.from('settings').select('rangoli_data').eq('id', 'rangoli_competition').single();
        if (error || !data) throw error;
        return data.rangoli_data as RangoliCompetitionData;
    } catch {
        await supabase.from('settings').upsert({ id: 'rangoli_competition', rangoli_data: defaultPrizeData }, { onConflict: 'id' });
        return defaultPrizeData;
    }
};

export const saveRangoliPrizes = async (data: Partial<RangoliCompetitionData>): Promise<void> => {
    const current = await getRangoliPrizes();
    const merged = { ...current, ...data };
    const { error } = await supabase.from('settings').upsert({ id: 'rangoli_competition', rangoli_data: merged }, { onConflict: 'id' });
    if (error) throw error;
};

function mapRangoliRow(r: Record<string, unknown>): RangoliEntry {
    return {
        id: r.id as string,
        artistName: r.artist_name as string,
        imageUrl: r.image_url as string,
        artistImageUrl: r.artist_image_url as string | undefined,
        votes: r.votes as number,
        description: r.description as string | undefined,
    };
}

// --- STORAGE CLEANUP AUDIT LOG ---

export const getStorageCleanupLog = async (limit = 100): Promise<StorageCleanupLog[]> => {
    try {
        const { data, error } = await supabase
            .from('storage_cleanup_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            bucket: r.bucket,
            path: r.path,
            sourceTable: r.source_table,
            sourceId: r.source_id ?? undefined,
            action: r.action,
            status: r.status,
            error: r.error ?? undefined,
            createdAt: r.created_at,
        }));
    } catch (error) {
        console.error('Error fetching storage cleanup log:', error);
        return [];
    }
};

// Re-export for compatibility
export { changeUserPassword } from './auth';
