'use client'
import { useRowLabel } from '@payloadcms/ui'

export const ServiceRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ name?: string; day?: string; time?: string }>()
  const parts = [data?.name, data?.time].filter(Boolean).join(' · ')
  return <span>{parts || `Service ${(rowNumber ?? 0) + 1}`}</span>
}
