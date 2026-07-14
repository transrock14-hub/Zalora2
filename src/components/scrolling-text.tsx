'use client'

import Image from 'next/image'

interface ScrollingTextProps {
  className?: string
}

export function ScrollingText({ className = '' }: ScrollingTextProps) {
  const messages = [
    "Start your first business now in your Zalora Fashion store!",
    "One stop management Store, inventory, orders, promotions, creator partnerships and customer service are all completed in the Zalora Fashion store.",
    "ZaloraFashion can strengthen its global market position through technological empowerment and ecosystem expansion, while also driving shopping trends. Start your first business now in the ZaloraFashion store!"
  ]

  return (
    <div className={`flex items-center gap-3 py-[6px] mb-0 ${className}`} style={{ backgroundColor: '#F2F7FF' }}>
      {/* Fixed Logo on the Left */}
      <div className="flex-shrink-0 pl-4">
        <div className="bg-white px-2.5 py-1 inline-flex items-center rounded shadow-sm">
          <Image 
            src="/images/logo.png" 
            alt="ZALORA" 
            width={70} 
            height={20} 
            className="object-contain"
          />
        </div>
      </div>

      {/* Scrolling Text on the Right */}
      <div className="flex-1 overflow-hidden">
        <div className="animate-scroll whitespace-nowrap flex items-center">
          {/* Repeat messages multiple times for seamless loop */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="inline-flex">
              {messages.map((text, idx) => (
                <span key={`${i}-${idx}`} className="inline-block px-6 text-xs font-semibold text-gray-700">
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
