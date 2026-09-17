import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon } from './Icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  titleId: string
  descriptionId?: string
  className?: string
  children: ReactNode
}

export function Modal({ open, onClose, titleId, descriptionId, className = '', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      const shouldRestoreFocus = document.activeElement === document.body || dialog.contains(document.activeElement)
      // Conditional dialogs can unmount before the native close algorithm runs.
      // Their opener may also disappear when a card changes groups.
      if (dialog.open) dialog.close()
      if (shouldRestoreFocus) {
        const target = opener?.isConnected ? opener : document.getElementById('home-title')
        target?.focus({ preventScroll: true })
      }
    }
  }, [open])

  return <dialog
    ref={ref}
    className={`modal ${className}`}
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClose={() => { if (!ref.current?.open) onClose() }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}
  >
    <button className="icon-button modal-close" aria-label="Fechar" onClick={onClose} autoFocus><CloseIcon /></button>
    {children}
  </dialog>
}
