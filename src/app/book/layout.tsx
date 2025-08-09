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
          // Устанавливаем CSS переменные заранее для предотвращения ошибок гидратации
          if (typeof document !== 'undefined') {
            // Устанавливаем переменные сразу при загрузке
            document.documentElement.style.setProperty('--tg-viewport-height', '100vh');
            document.documentElement.style.setProperty('--tg-viewport-stable-height', '100vh');
            
            // Блокируем изменения этих переменных
            Object.defineProperty(document.documentElement.style, 'setProperty', {
              value: function(property, value, priority) {
                if (property && property.startsWith('--tg-viewport')) {
                  return; // Игнорируем
                }
                return CSSStyleDeclaration.prototype.setProperty.call(this, property, value, priority);
              }
            });
          }
        `}
      </Script>
      {children}
    </>
  )
}