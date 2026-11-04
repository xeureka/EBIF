import { useEffect, useState } from "react";

const SLIDE_MS = 3500;

export function PhotoSlideshow({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [images.length]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {images.map((src, imageIndex) => (
        <img
          key={src}
          src={src}
          alt={imageIndex === 0 ? alt : ""}
          aria-hidden={imageIndex === 0 ? undefined : true}
          loading={imageIndex === 0 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out"
          style={{
            opacity: imageIndex === index ? 1 : 0,
            objectPosition: src.toLowerCase().includes("founder") ? "right center" : "center",
          }}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {images.map((src, imageIndex) => (
            <button
              key={src}
              type="button"
              aria-label={`Show slide ${imageIndex + 1}`}
              onClick={() => setIndex(imageIndex)}
              className={`h-1.5 rounded-full transition-all ${
                imageIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
