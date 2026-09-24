import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

export const uploadNotificationMedia = async (file: File, folder: 'images' | 'pdfs'): Promise<string> => {
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `notifications/${folder}/${filename}`);
    
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    
    return downloadUrl;
};
