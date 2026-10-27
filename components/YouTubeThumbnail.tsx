/**
 * Miniatura estática de un video de YouTube (solo una imagen; no carga el reproductor).
 * Se usa como `thumbnail` de VideoModalCard. maxresdefault = 1280×720 sin franjas negras
 * (hqdefault es 480×360 con franjas y se ve borrosa al escalar).
 */
export function YouTubeThumbnail({ videoId }: { videoId: string }) {
  return (
    <span className="video-thumb">
      <picture>
        <source type="image/webp" srcSet={`https://i.ytimg.com/vi_webp/${videoId}/maxresdefault.webp`} />
        <img
          src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
          alt=""
          width={1280}
          height={720}
          loading="lazy"
          decoding="async"
        />
      </picture>
    </span>
  );
}
