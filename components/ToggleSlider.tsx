import React from 'react'
import {  type FeatureKey } from '@/types/features'

interface ToggleSliderProps {
  toggleKey: FeatureKey
  isEnabled: boolean
  toggle: (key: FeatureKey, field: 'globalEnabled' | 'beta', value: boolean) => void
  label?: string
  field:'globalEnabled' | 'beta'
  primaryColor?: string
}

function ToggleSlider({ toggleKey, isEnabled, field, toggle, label, primaryColor = 'bg-indigo-600' }: ToggleSliderProps) {
  return (
    <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{label}</span>
        <button
        onClick={() => toggle(toggleKey, field, !isEnabled)}
        className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${isEnabled ? primaryColor : 'bg-gray-200'}`}
        >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x' : 'left-0'}`} />
        </button>
    </div>
  )
}

export default ToggleSlider