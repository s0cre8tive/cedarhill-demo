import React from 'react'
import { teamCommOn } from '../../lib/package'
import { BellClient } from './BellClient'

/** Bell in the dashboard header with the unread count (Cathedral). */
export const Bell = () => (teamCommOn() ? <BellClient /> : null)
