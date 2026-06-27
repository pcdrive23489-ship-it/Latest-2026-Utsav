
import { supabase } from '@/lib/supabase';
import { validateUploadFile } from '@/lib/validation';

const BUCKET = 'uploads';

export const uploadFile = async (
    file: File,
    path: string,
    onProgress?: (progress: number) => void
): Promise<string> => {
    const validationError = validateUploadFile(file);
    if (validationError) throw new Error(validationError);

    // Supabase Storage doesn't support native progress events via JS SDK.
    // We call onProgress at 0 and 100 as bookends.
    if (onProgress) onProgress(0);

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

    if (error) {
        console.error('Upload failed:', error);
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path);

    if (onProgress) onProgress(100);
    return urlData.publicUrl;
};
