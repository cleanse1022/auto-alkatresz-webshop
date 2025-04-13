import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
import { ImageService } from '../services/image.service';

@Directive({
  selector: 'img[appImageFallback]',
  standalone: true
})
export class ImageFallbackDirective {
  @Input() appImageFallback: string | undefined;
  
  private el: ElementRef;
  private imageService = inject(ImageService);
  
  constructor(el: ElementRef) {
    this.el = el;
  }
  
  @HostListener('error')
  onError() {
    const imgElement = this.el.nativeElement;
    imgElement.src = this.appImageFallback || this.imageService.getPlaceholderImageUrl();
    imgElement.classList.add('placeholder-image');
  }
}
