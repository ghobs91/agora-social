import { YoutubeUrlRegex } from "@/Utils/Const";

export default function YoutubeEmbed({ link }: { link: string }) {
  const m = link.match(YoutubeUrlRegex);
  if (!m) return;

  return (
    <iframe
      className="-mx-4 md:mx-0 w-max my-2"
      src={`https://www.youtube.com/embed/${m[1]}${m[3] ? `?list=${m[3].slice(6)}` : ""}`}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen={true}
    />
  );
}
