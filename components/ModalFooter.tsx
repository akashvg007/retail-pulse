"use client"

import { Button } from '@/components/ui/Button'
import { useFormStatus } from 'react-dom'

export default function ModalFooter({  primaryButton, secondaryButton }: { 
  primaryButton: { label?: string, onClick?: () => void, loadingText?: string, disabled?: boolean },
  secondaryButton: { label?: string, onClick?: () => void }
}) {

    const { pending } = useFormStatus()
  
    const {
      label: primaryLabel = 'Create',
      onClick: primaryOnClick,
      loadingText = 'Creating…',
      disabled: primaryDisabled = false,
    } = primaryButton
    const { label: secondaryLabel ='Cancel', onClick: secondaryOnClick } = secondaryButton

    return (
    <div className="flex gap-2 pt-2">
        <Button type="submit" 
            onClick={primaryOnClick}
        disabled={primaryDisabled || pending}
            className="flex-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded">
            {pending ? loadingText : primaryLabel}
        </Button>
        <Button type="button" className="text-black cursor-pointer" variant="secondary" onClick={secondaryOnClick }>{secondaryLabel}</Button>
    </div>
  )
}