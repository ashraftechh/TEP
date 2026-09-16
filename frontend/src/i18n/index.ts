import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import authEn from '@/locales/en/auth.json';
import authAr from '@/locales/ar/auth.json';
import profileEn from '@/locales/en/profile.json';
import profileAr from '@/locales/ar/profile.json';
import commonEn from '@/locales/en/common.json';
import commonAr from '@/locales/ar/common.json';
import companiesEn from '@/locales/en/companies.json';
import companiesAr from '@/locales/ar/companies.json';
import opportunitiesEn from '@/locales/en/opportunities.json';
import opportunitiesAr from '@/locales/ar/opportunities.json';
import applicationsEn from '@/locales/en/applications.json';
import applicationsAr from '@/locales/ar/applications.json';
import trainingAssignmentsEn from '@/locales/en/trainingAssignments.json';
import trainingAssignmentsAr from '@/locales/ar/trainingAssignments.json';
import attendanceEn from '@/locales/en/attendance.json';
import attendanceAr from '@/locales/ar/attendance.json';
import reportsEn from '@/locales/en/reports.json';
import reportsAr from '@/locales/ar/reports.json';

const resources = {
  en: {
    auth: authEn,
    profile: profileEn,
    common: commonEn,
    companies: companiesEn,
    opportunities: opportunitiesEn,
    applications: applicationsEn,
    trainingAssignments: trainingAssignmentsEn,
    attendance: attendanceEn,
    reports: reportsEn,
  },
  ar: {
    auth: authAr,
    profile: profileAr,
    common: commonAr,
    companies: companiesAr,
    opportunities: opportunitiesAr,
    applications: applicationsAr,
    trainingAssignments: trainingAssignmentsAr,
    attendance: attendanceAr,
    reports: reportsAr,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    defaultNS: 'auth',
    ns: [
      'auth',
      'profile',
      'common',
      'companies',
      'opportunities',
      'applications',
      'trainingAssignments',
      'attendance',
      'reports',
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export const updateHtmlDirection = (lng: string) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
};

i18n.on('languageChanged', (lng) => {
  updateHtmlDirection(lng);
});

// Initial direction setting
updateHtmlDirection(i18n.language || 'ar');

export default i18n;
