import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';

@Component({
  selector: 'app-patient-about',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-about.html',
  styleUrl: './patient-about.css',
})
export class PatientAbout implements AfterViewInit, OnDestroy {
  @ViewChild('aboutVideo') aboutVideo!: ElementRef<HTMLVideoElement>;

  protected isMuted = true;
  private observer?: IntersectionObserver;

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
            video.play().catch(() => undefined);
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

  protected toggleMute(): void {
    const video = this.aboutVideo?.nativeElement;
    if (!video) return;

    video.muted = !video.muted;
    this.isMuted = video.muted;

    if (!video.paused) {
      video.play().catch(() => undefined);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
