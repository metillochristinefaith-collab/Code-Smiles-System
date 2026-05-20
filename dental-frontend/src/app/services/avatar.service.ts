import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

const AVATAR_KEY = 'user_avatar';

@Injectable({ providedIn: 'root' })
export class AvatarService {

  constructor(private api: ApiService, private auth: AuthService) {}

  /** Get avatar from localStorage cache */
  getAvatar(): string {
    return localStorage.getItem(AVATAR_KEY) ?? '';
  }

  /** Save avatar to localStorage cache */
  setAvatar(url: string): void {
    localStorage.setItem(AVATAR_KEY, url);
  }

  /** Clear avatar cache */
  clearAvatar(): void {
    localStorage.removeItem(AVATAR_KEY);
  }

  /**
   * Load avatar from database if not in localStorage
   */
  async loadAvatarFromDB(): Promise<void> {
    const cachedAvatar = this.getAvatar();
    if (cachedAvatar) {
      return; // Already have it in cache
    }

    const user = this.auth.getUser();
    if (!user?.id) {
      return;
    }

    // Try to fetch avatar from database using getUserProfile
    try {
      const userData: any = await this.api.getUserProfile(user.id).toPromise();
      if (userData?.avatar) {
        this.setAvatar(userData.avatar);
      }
    } catch (err: any) {
      console.error('Failed to load avatar from DB:', err);
    }
  }

  /**
   * Handle file input change — converts to base64, saves to DB and cache.
   * Returns a Promise that resolves with the base64 string.
   */
  uploadFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('Starting avatar upload...', file.name, file.type, file.size);

      if (!file.type.startsWith('image/')) {
        reject('Please select a valid image file (JPG, PNG, or GIF). Other file types are not supported.');
        return;
      }
      if (file.size > 500 * 1024) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        reject(`Image is too large (${sizeInMB}MB). Please use an image under 500KB (0.5MB). Try resizing your photo or using a smaller image file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        console.log('File converted to base64, length:', base64.length);

        const user = this.auth.getUser();
        if (!user?.id) {
          reject('You are not logged in. Please log in and try again.');
          return;
        }

        console.log('Calling updateAvatar API for user:', user.id);
        this.api.updateAvatar(user.id, base64).subscribe({
          next: (response: any) => {
            console.log('Avatar upload successful:', response);
            this.setAvatar(base64);
            resolve(base64);
          },
          error: (err: any) => {
            console.error('Avatar upload failed:', err);
            
            // User-friendly error messages
            let errorMessage = 'Unable to upload photo. Please try again with a smaller image file.';
            
            if (err?.error?.message) {
              errorMessage = err.error.message;
            } else if (err?.message) {
              errorMessage = err.message;
            }
            
            // Add helpful context for common errors
            if (errorMessage.toLowerCase().includes('payload') || errorMessage.toLowerCase().includes('large')) {
              errorMessage = 'Photo is too large for upload. Please resize your image to under 500KB and try again.';
            } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
              errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (errorMessage.toLowerCase().includes('server') || errorMessage.toLowerCase().includes('internal')) {
              errorMessage = 'Server error. Please try again in a moment or use a different image.';
            }
            
            reject(errorMessage);
          }
        });
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        reject('Unable to read the image file. Please try a different image.');
      };
      reader.readAsDataURL(file);
    });
  }
}
