'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('pinnacle-theme') as Theme | null;

    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const systemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      const actualTheme =
        theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

      setResolvedTheme(actualTheme);

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(actualTheme);
      document.documentElement.style.colorScheme = actualTheme;
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)'
      );

      mediaQuery.addEventListener('change', applyTheme);

      return () => {
        mediaQuery.removeEventListener('change', applyTheme);
      };
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('pinnacle-theme', newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
