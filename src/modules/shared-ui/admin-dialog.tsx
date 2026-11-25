'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

export function AdminDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className={'admin-dialog-content' + (wide ? ' admin-dialog-wide' : '')}
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
        >
          <div className="admin-dialog-header">
            <div className="min-w-0">
              <Dialog.Title className="editorial text-[27px]">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-xs leading-6 text-muted">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close className="admin-dialog-close" aria-label="Cerrar">
              <X size={22} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="admin-dialog-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
