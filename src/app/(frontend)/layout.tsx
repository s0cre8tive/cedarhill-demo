import React from 'react'
import '@fontsource/anton'
import '@fontsource-variable/figtree/wght.css'
import './styles.css'

export const metadata = {
  title: 'Cedar Hill Church · Maple Grove',
  description: 'Cedar Hill Church is a church family in Maple Grove. Deep roots, open doors. (Demo site for Kingdom Kit.)',
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
