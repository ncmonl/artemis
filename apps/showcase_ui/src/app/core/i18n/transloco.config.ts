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

import { EnvironmentProviders, Injectable, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { Translation, TranslocoLoader, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { Observable, forkJoin, of } from 'rxjs';

import en from '../../../i18n/en.json';
import zh from '../../../i18n/zh.json';
import { AVAILABLE_LANGS, initialLang } from './language.service';

// Bundled with the app (no HTTP fetch): the backend's static routes stay
// untouched and a language switch never flashes raw keys.
const TRANSLATIONS: Record<string, Translation> = { en, zh };

@Injectable({ providedIn: 'root' })
export class BundledTranslationLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(TRANSLATIONS[lang] ?? TRANSLATIONS['en']);
  }
}

export function provideAppTransloco(): EnvironmentProviders[] {
  const transloco = provideTransloco({
    config: {
      availableLangs: [...AVAILABLE_LANGS],
      defaultLang: initialLang(),
      fallbackLang: 'en',
      // Keys missing from zh.json render the English text instead of the raw key.
      missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: BundledTranslationLoader,
  });
  // Load every language before the first render, so synchronous
  // TranslocoService.translate() calls (computed tooltips) never see raw keys.
  const preload = provideAppInitializer(() => {
    const service = inject(TranslocoService);
    return forkJoin(AVAILABLE_LANGS.map(lang => service.load(lang)));
  });
  return [...transloco, preload];
}
