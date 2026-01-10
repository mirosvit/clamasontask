import { commonLocales } from '../locales/common';
import { tasksLocales } from '../locales/tasks';
import { erpLocales } from '../locales/erp';
import { analyticsLocales } from '../locales/analytics';
import { settingsLocales } from '../locales/settings';
import { productionLocales } from '../locales/production';

/**
 * Agregovaný objekt prekladov pre celú aplikáciu.
 * Rozdelené do modulov pre lepšiu udržateľnosť a ochranu pred preťažením tokenov.
 */
export const translations = {
  sk: {
    ...commonLocales.sk,
    ...tasksLocales.sk,
    ...erpLocales.sk,
    ...analyticsLocales.sk,
    ...settingsLocales.sk,
    ...productionLocales.sk,
  },
  en: {
    ...commonLocales.en,
    ...tasksLocales.en,
    ...erpLocales.en,
    ...analyticsLocales.en,
    ...settingsLocales.en,
    ...productionLocales.en,
  }
};

export type AppTranslationKey = keyof typeof translations['sk'];