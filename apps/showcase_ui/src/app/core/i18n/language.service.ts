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

import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

export const AVAILABLE_LANGS = ['en', 'zh'] as const;
export type AppLang = (typeof AVAILABLE_LANGS)[number];

const STORAGE_KEY = 'artemis.lang';

/** Saved choice first, then the browser language; English otherwise. */
export function initialLang(): AppLang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (AVAILABLE_LANGS as readonly string[]).includes(saved)) {
      return saved as AppLang;
    }
  } catch {
    // Storage blocked (privacy mode): fall through to the browser language.
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language : '';
  return browser.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** Active UI language: switches Transloco, persists the choice and keeps <html lang> in sync. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);
  private document = inject(DOCUMENT);

  readonly lang = signal<AppLang>(this.transloco.getActiveLang() as AppLang);

  constructor() {
    this.apply(this.lang());
  }

  toggle(): void {
    this.use(this.lang() === 'en' ? 'zh' : 'en');
  }

  use(lang: AppLang): void {
    this.transloco.setActiveLang(lang);
    this.lang.set(lang);
    this.apply(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Not persisted; the choice still applies to this page view.
    }
  }

  private apply(lang: AppLang): void {
    this.document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}
