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
      <Script id="telegram-css-fix" strategy="afterInteractive">
        {`
          // Устанавливаем CSS переменные по умолчанию для предотвращения ошибок гидратации
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--tg-viewport-height', '100vh');
            document.documentElement.style.setProperty('--tg-viewport-stable-height', '100vh');
          }
        `}
      </Script>
      {children}
    </>
  )
}