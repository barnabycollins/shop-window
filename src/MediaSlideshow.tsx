import { Fragment } from "react/jsx-runtime";
import { AppConfig, MediaEntryWithElement } from "./appConfig";
import { useEffect, useRef } from "react";
import { MissingMediaError } from "./errors";

export function MediaSlideshow({
  config,
  mediaEntries,
}: {
  config: AppConfig;
  mediaEntries: MediaEntryWithElement[];
}) {
  const currentEntry = useRef(-1);
  const currentTimeout = useRef<number | undefined>(undefined);

  const showNextMediaItem = () => {
    if (mediaEntries.length < 1)
      throw new MissingMediaError("showNextMediaItem()", mediaEntries);

    currentEntry.current = (currentEntry.current + 1) % mediaEntries.length;

    const nextEntry = mediaEntries[currentEntry.current];

    const isValidVideo =
      nextEntry.mimeType.startsWith("video") &&
      (nextEntry.element as HTMLVideoElement | undefined)?.duration;

    let slideLength = config.slideLength;

    if (isValidVideo) {
      const videoRef = mediaEntries[currentEntry.current]
        .element as HTMLVideoElement;

      if (videoRef) {
        console.debug(`Triggering playback for video "${nextEntry.name}".`);

        videoRef.pause();
        videoRef.currentTime = 0;
        videoRef.play().catch(() => {
          console.debug(
            `Failed to autoplay video. Muting video and trying again...`
          );
          videoRef.muted = true;
          videoRef.play();
        });

        slideLength = videoRef.duration * 1000 - config.fadeTime;
      }
    }

    mediaEntries.forEach((entry) => {
      if (entry.element)
        entry.element.style.opacity = entry.url === nextEntry.url ? "1" : "0";
    });

    currentTimeout.current = setTimeout(showNextMediaItem, slideLength);
  };

  useEffect(() => {
    showNextMediaItem();

    return () => {
      currentEntry.current = -1;
      if (currentTimeout.current) {
        clearTimeout(currentTimeout.current);
      }
    };
  }, []);

  return mediaEntries.map(({ mimeType, url }, index) => {
    const fadeTime = config.fadeTime;

    const commonProps = {
      src: url,
      style: {
        opacity: 0,
        transition:
          fadeTime && fadeTime > 0 ? `opacity ${fadeTime}s` : undefined,
      },
      className: "slide-element",
      ref: (element: HTMLVideoElement | HTMLImageElement | null) => {
        if (element) mediaEntries[index].element = element;
      },
    } as const;

    return (
      <Fragment key={url}>
        {mimeType.startsWith("video") ? (
          <video {...commonProps} />
        ) : (
          <img {...commonProps} />
        )}
      </Fragment>
    );
  });
}
