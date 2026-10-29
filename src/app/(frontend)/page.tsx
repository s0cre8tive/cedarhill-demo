import React from 'react'
import { getHomeData } from '@/lib/site'
import Home from './Home'
import './home.css'

// Always show what staff saved most recently.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const data = await getHomeData()
  return <Home data={data} />
}
