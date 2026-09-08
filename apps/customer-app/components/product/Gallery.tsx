import Image from 'next/image';
import type { Lang, Product } from '@mucho-loco/types';

interface GalleryProps {
  product: Product;
  lang: Lang;
}

export function Gallery({ product, lang }: GalleryProps) {
  return (
    <div className="gallery">
      <div className="main-img">
        {product.tag && (
          <div className={`absolute top-4 left-4 px-3 py-[6px] font-mono text-11 tracking-wide-2xl z-[2] ${product.tag === 'HOT' ? 'bg-ml-red-bright text-ml-cream' : product.tag === 'NEW' ? 'bg-ml-yellow text-ml-black' : 'bg-ml-red text-ml-cream'}`}>
            {product.tag}
          </div>
        )}
        <Image src={product.img} alt={product.name[lang]} fill sizes="(max-width: 980px) 100vw, 50vw" className="object-cover" priority />
      </div>
    </div>
  );
}
