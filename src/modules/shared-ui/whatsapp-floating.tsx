import Image from 'next/image';

export function WhatsAppFloating() {
  return (
    <a
      className="fixed right-6 bottom-[max(24px,env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#0e9589] shadow-[0_5px_16px_#17374733] transition-colors hover:bg-[#087e74] max-sm:right-4"
      href="https://wa.me/5493875330834"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
    >
      <Image src="/icons/whatsapp.svg" alt="" width={28} height={28} />
    </a>
  );
}
