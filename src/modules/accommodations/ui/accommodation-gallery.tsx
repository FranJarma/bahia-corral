'use client';

import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function AccommodationGallery({
  name,
  images,
}: {
  name: string;
  images: readonly string[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const isOpen = active !== null;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
      if (event.key === 'ArrowRight')
        setActive((value) => (value === null ? value : (value + 1) % images.length));
      if (event.key === 'ArrowLeft')
        setActive((value) =>
          value === null ? value : (value - 1 + images.length) % images.length,
        );
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', listener);
    };
  }, [images.length, isOpen]);

  return (
    <>
      <div className={images.length > 1 ? 'grid gap-3 md:grid-cols-[2fr_1fr]' : ''}>
        <button
          onClick={() => setActive(0)}
          type="button"
          aria-label={`Ver galería de ${name}`}
          className="group relative aspect-[1.13] w-full overflow-hidden rounded-2xl bg-sand text-left md:aspect-[1.16]"
        >
          <Image
            src={images[0]}
            alt={`Foto principal de ${name}`}
            fill
            priority
            sizes="(max-width:768px) 100vw,720px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
          <span className="absolute right-4 bottom-4 flex items-center gap-2 rounded-full bg-cream-soft px-4 py-2 text-xs font-semibold text-ink">
            <Expand size={15} /> Ver fotos
          </span>
        </button>
        {images.length > 1 && (
          <div className="hidden grid-rows-3 gap-3 md:grid">
            {images.slice(1, 4).map((src, index) => (
              <button
                type="button"
                key={src}
                onClick={() => setActive(index + 1)}
                aria-label={`Ver imagen ${index + 2} de ${name}`}
                className="relative min-h-0 overflow-hidden rounded-xl"
              >
                <Image
                  src={src}
                  alt={`${name}, foto ${index + 2}`}
                  fill
                  sizes="240px"
                  className="object-cover transition-transform duration-300 hover:scale-[1.025]"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {active !== null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1d25]/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de imágenes de ${name}`}
        >
          <div className="relative w-full max-w-[1100px]">
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Cerrar galería"
              className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-cream-soft text-ink"
            >
              <X />
            </button>
            <div className="relative aspect-[1.57] w-full overflow-hidden rounded-2xl bg-[#162b36]">
              <Image
                src={images[active]}
                alt={`${name}, imagen ${active + 1} de ${images.length}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex items-center justify-between text-white">
                <button
                  type="button"
                  onClick={() => setActive((active - 1 + images.length) % images.length)}
                  aria-label="Imagen anterior"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40"
                >
                  <ChevronLeft />
                </button>
                <span className="text-sm">
                  {active + 1} de {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActive((active + 1) % images.length)}
                  aria-label="Imagen siguiente"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40"
                >
                  <ChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
