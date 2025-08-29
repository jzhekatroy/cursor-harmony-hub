import React, { useState } from 'react'

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const { src, alt, style, className, ...rest } = props

  if (!src || didError) {
    return (
      <div className={`inline-block bg-gray-200 dark:bg-gray-700 text-center align-middle ${className ?? ''}`} style={style}>
        <div className="flex items-center justify-center w-full h-full select-none">
          <span role="img" aria-label="placeholder" className="text-3xl">🙂</span>
        </div>
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} style={style} {...rest} onError={() => setDidError(true)} />
}



