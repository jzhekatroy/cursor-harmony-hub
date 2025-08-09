import Script from 'next/script'

export default function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script 
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <Script id="telegram-css-fix" strategy="beforeInteractive">
        {`
          // Предотвращаем изменение CSS переменных Telegram WebApp для избежания ошибок гидратации
          if (typeof window !== 'undefined') {
            // Переопределяем setProperty для блокировки изменений tg-viewport переменных
            const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
            CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
              if (property.startsWith('--tg-viewport')) {
                return; // Игнорируем установку tg-viewport переменных
              }
              return originalSetProperty.call(this, property, value, priority);
            };
          }
        `}
      </Script>
      {children}
    </>
  )
}