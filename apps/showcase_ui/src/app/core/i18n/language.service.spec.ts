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

import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import en from '../../../i18n/en.json';
import zh from '../../../i18n/zh.json';
import { LanguageService, initialLang } from './language.service';
import { provideAppTransloco } from './transloco.config';

const STORAGE_KEY = 'artemis.lang';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideAppTransloco()] });
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('toggles language, persists the choice and updates <html lang>', () => {
    const service = TestBed.inject(LanguageService);
    service.use('en');

    service.toggle();

    expect(service.lang()).toBe('zh');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('zh');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('prefers the saved language over the browser language', () => {
    localStorage.setItem(STORAGE_KEY, 'zh');
    expect(initialLang()).toBe('zh');
    localStorage.setItem(STORAGE_KEY, 'fr');
    expect(['en', 'zh']).toContain(initialLang());
  });

  it('translates a key with parameters in both languages', () => {
    const transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('zh');
    expect(transloco.translate('workspace.stop_task_id', { id: 'abc' })).toBe('停止当前任务（abc）');
    transloco.setActiveLang('en');
    expect(transloco.translate('workspace.stop_task_id', { id: 'abc' })).toBe('Stop current task (abc)');
  });
});

describe('translation files', () => {
  const params = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(p => p.replace(/\s/g, '')).sort();

  it('have the same keys in en and zh', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  it('use the same interpolation parameters in en and zh', () => {
    const enMap = en as Record<string, string>;
    const zhMap = zh as Record<string, string>;
    const mismatched = Object.keys(enMap).filter(k => params(enMap[k]).join() !== params(zhMap[k] ?? '').join());
    expect(mismatched).toEqual([]);
  });
});
