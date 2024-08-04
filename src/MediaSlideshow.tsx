import { Fragment } from "react/jsx-runtime";
import { AppConfig, MediaEntryWithElement } from "./appConfig";
import { useCallback, useEffect, useRef } from "react";

/**
 * A component to render a slideshow given the provided config and media entries.
 */
export function MediaSlideshow({
  config,
  mediaEntries,
}: {
  config: AppConfig;
  mediaEntries: MediaEntryWithElement[];
}) {
  /** The index of the currently-displayed entry */
  const currentEntry = useRef(-1);
  /** The timeout that will trigger the next execution of showNextMediaItem(). Used for cleanup in case of unmount. */
  const currentTimeout = useRef<number | undefined>(undefined);

  /** Does what it says on the tin. */
  const showNextMediaItem = useCallback(() => {
    // Update currentEntry
    currentEntry.current = (currentEntry.current + 1) % mediaEntries.length;

    /** The next entry from mediaEntries */
    const nextEntry = mediaEntries[currentEntry.current];

    /** Whether or not the entry is a video with a duration on the corresponding element. */
    const isValidVideo =
      nextEntry.mimeType.startsWith("video") &&
      (nextEntry.element as HTMLVideoElement | undefined)?.duration;

    /** Grab slide length from the config, to be changed if necessary. */
    let slideLength = config.slideLength;

    // If it's a valid video, we need to hit play on it as it appears.
    if (isValidVideo) {
      /** The actual <video> element in the DOM. */
      const videoElement = mediaEntries[currentEntry.current]
        .element as HTMLVideoElement;

      console.debug(`Triggering playback for video "${nextEntry.name}".`);

      // Ensure that the video is paused, reset to the start and play again.
      videoElement.pause();
      videoElement.currentTime = 0;
      videoElement.play().catch(() => {
        // Browser privacy settings may stop the video from auto-playing without user interaction.
        // Most browsers *will* allow autoplay if the video is muted though, so try muting it
        // and playing again.
        console.debug(
          `Failed to autoplay video. Muting video and trying again...`
        );
        videoElement.muted = true;
        videoElement.play();
      });

      // We probably want to show the full video (= show next item as the video ends)
      // The ignoreVideoLength parameter can be used to disable this function if necessary.
      if (!config.ignoreVideoLength)
        slideLength = videoElement.duration * 1000 - config.fadeTime;
    }

    // Update media opacity for all elements.
    mediaEntries.forEach((entry) => {
      if (entry.element)
        entry.element.style.opacity = entry.url === nextEntry.url ? "1" : "0";
    });

    // Set a timeout to call this function again at the right time (either after config.slideLength or as the video finishes)
    currentTimeout.current = setTimeout(showNextMediaItem, slideLength);
  }, [mediaEntries, config]);

  useEffect(() => {
    // On first render, run showNextMediaItem. This will trigger the next slide when it finishes.
    showNextMediaItem();

    return () => {
      currentEntry.current = -1;
      if (currentTimeout.current) {
        clearTimeout(currentTimeout.current);
      }
    };
  }, []);

  return mediaEntries.map(({ mimeType, url }, index) => {
    // Props to be applied to the rendered element (<img> or <video>)
    const elementProps = {
      // Media source
      src: url,
      // Used for layout
      className: "slide-element",
      style: {
        // Default opacity to 0
        opacity: 0,
        // Enable CSS-based fade in / out if a fade time is configured
        transition:
          config.fadeTime && config.fadeTime > 0
            ? `opacity ${config.fadeTime}s`
            : undefined,
      },
      // Attach the element to the relevant mediaEntry
      ref: (element: HTMLVideoElement | HTMLImageElement | null) => {
        if (element) mediaEntries[index].element = element;
      },
    } as const;

    return (
      <Fragment key={url}>
        {mimeType.startsWith("video") ? (
          <video {...elementProps} />
        ) : (
          <img {...elementProps} />
        )}
      </Fragment>
    );
  });
}
