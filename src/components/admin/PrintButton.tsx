'use client'

import React from 'react'

export function PrintButton() {
  return (
    <button type="button" className="ch-btn" onClick={() => window.print()}>
      Print the sign
    </button>
  )
}
