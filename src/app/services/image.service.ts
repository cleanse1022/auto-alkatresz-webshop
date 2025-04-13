import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly placeholderImagePath = 'assets/images/placeholder.png';

  constructor() { }

  /**
   * Returns either the provided image URL or the placeholder image if none is provided
   * @param imageUrl The original image URL (optional)
   * @returns A valid image URL
   */
  getImageUrl(imageUrl?: string | null): string {
    return imageUrl && imageUrl.trim() ? imageUrl : this.placeholderImagePath;
  }

  /**
   * Returns the placeholder image URL
   */
  getPlaceholderImageUrl(): string {
    return this.placeholderImagePath;
  }

  /**
   * Handler for image error events to replace broken images with the placeholder
   * @param event The error event from the image
   */
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = this.placeholderImagePath;
      imgElement.classList.add('placeholder-image');
    }
  }
}
