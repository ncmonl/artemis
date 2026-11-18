/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-nav-switcher',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  template: `
    <nav class="floating-nav-switcher" [attr.aria-label]="'nav.main_navigation' | transloco">
      <a
        routerLink="/"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: true}"
        class="nav-tab-btn"
        [title]="'nav.home_title' | transloco"
      >
        <span class="material-symbols-outlined tab-icon">add_task</span>
        <span class="tab-label">{{ 'nav.home' | transloco }}</span>
      </a>
      <a
        routerLink="/workspace"
        routerLinkActive="active"
        class="nav-tab-btn"
        [title]="'nav.workspace_title' | transloco"
      >
        <span class="material-symbols-outlined tab-icon">space_dashboard</span>
        <span class="tab-label">{{ 'nav.workspace' | transloco }}</span>
      </a>
      <button
        type="button"
        class="nav-tab-btn nav-lang-btn"
        (click)="language.toggle()"
        [title]="'nav.switch_language' | transloco"
        [attr.aria-label]="'nav.switch_language' | transloco"
      >
        <span class="material-symbols-outlined tab-icon">translate</span>
        <!-- Names the language a click switches to, in that language -->
        <span class="tab-label">{{ language.lang() === 'en' ? '中文' : 'EN' }}</span>
      </button>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nav-switcher.component.scss']
})
export class NavSwitcherComponent {
  protected language = inject(LanguageService);
}
