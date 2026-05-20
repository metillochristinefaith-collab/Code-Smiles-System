import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-public-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-about.html',
  styleUrls: ['./public-about.css']
})
export class PublicAboutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('aboutVideo') aboutVideo!: ElementRef<HTMLVideoElement>;

  isMuted = true;
  private observer?: IntersectionObserver;

  constructor(private router: Router, private auth: AuthService) {}

  handleBook(): void {
    if (this.auth.isLoggedIn() && this.auth.getRole() === 'Patient') {
      this.router.navigate(['/patient-booking']);
    } else if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.getDashboardRoute()]);
    } else {
      this.router.navigate(['/login'], { queryParams: { redirect: 'booking' } });
    }
  }

  ngAfterViewInit(): void {
    const video = this.aboutVideo?.nativeElement;

    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            video.play().catch((err) => {
              console.warn('Video play blocked:', err);
            });
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: [0, 0.25, 0.45, 0.7]
      }
    );

    this.observer.observe(video);
  }

  toggleMute(): void {
    const video = this.aboutVideo?.nativeElement;
    if (!video) return;

    video.muted = !video.muted;
    this.isMuted = video.muted;

    if (!video.paused) {
      video.play().catch((err) => {
        console.warn('Video replay blocked:', err);
      });
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}