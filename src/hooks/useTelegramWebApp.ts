import { useState, useEffect } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  isAvailable: boolean;
  user?: TelegramUser;
  showAlert: (message: string) => void;
  close: () => void;
  expand: () => void;
}

export function useTelegramWebApp(): TelegramWebApp {
  const [webApp, setWebApp] = useState<TelegramWebApp>({
    isAvailable: false,
    showAlert: (message: string) => alert(message),
    close: () => window.close(),
    expand: () => {},
  });

  useEffect(() => {
    // Проверяем наличие Telegram WebApp API
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      setWebApp({
        isAvailable: true,
        user: tg.initDataUnsafe?.user,
        showAlert: (message: string) => tg.showAlert(message),
        close: () => tg.close(),
        expand: () => tg.expand(),
      });
      
      // Расширяем приложение на весь экран
      tg.expand();
    }
  }, []);

  return webApp;
}