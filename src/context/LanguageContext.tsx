"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../dictionaries/en';
import { sl } from '../dictionaries/sl';

const translations: any = { en, sl };

const LanguageContext = createContext<any>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('en');

  // Ob prvem zagonu preberemo jezik iz localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gw_language');
    if (saved) setLocale(saved);
  }, []);

  const changeLanguage = (lang: string) => {
    setLocale(lang);
    localStorage.setItem('gw_language', lang);
  };

  const t = translations[locale];

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);