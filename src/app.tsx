import ReactDOM from "react-dom/client";
import {
  Fragment,
  StrictMode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BarLoader } from "react-spinners";
import {
  AppConfig,
  getAppConfig,
  getMedia,
  MediaEntry,
  RotationValue,
} from "./appConfig";
import { ErrorMessageBox } from "./MissingParamsBox";
import { MissingConfigError, MissingMediaError, ParamError } from "./errors";

function getRotationContainerStyle(rotation: RotationValue) {
  return {
    ...(rotation
      ? {
          transform: `rotate(${rotation}deg)`,
        }
      : {}),
    ...(rotation === 90 || rotation === 270
      ? {
          height: "100vw",
          width: "100vh",
        }
      : {
          height: "100vh",
          width: "100vw",
        }),
  };
}

function App() {
  const appConfig = useRef<AppConfig | undefined>(undefined);
  const mediaEntries = useRef<MediaEntry[]>([]);

  const videoRefs = useRef<{ [url: string]: HTMLVideoElement }>({});

  const [shownIndex, setShownIndex] = useState(0);

  const [showMiddleItems, setShowMiddleItems] = useState(true);

  const [setupError, setSetupError] = useState<ParamError | undefined>(
    undefined
  );

  const fetchMedia = useCallback(async () => {
    if (!appConfig.current)
      throw new MissingConfigError("showNextMediaItem()", appConfig.current);

    const entries = await getMedia(appConfig.current);
    mediaEntries.current = entries;
  }, []);

  const showNextMediaItem = useCallback(() => {
    setShownIndex((current) => {
      if (!appConfig.current)
        throw new MissingConfigError("showNextMediaItem()", appConfig.current);
      if (!mediaEntries.current || mediaEntries.current.length === 0)
        throw new MissingMediaError(
          "showNextMediaItem()",
          mediaEntries.current
        );

      const next = (current + 1) % mediaEntries.current.length;

      const nextEntry = mediaEntries.current[next];

      const videoRef =
        nextEntry.mimeType.startsWith("video") &&
        nextEntry.url in videoRefs.current
          ? videoRefs.current[nextEntry.url]
          : undefined;

      if (videoRef) {
        videoRefs.current[nextEntry.url].pause();
        videoRefs.current[nextEntry.url].currentTime = 0;
        videoRefs.current[nextEntry.url].play();
      }

      setTimeout(
        showNextMediaItem,
        videoRef
          ? videoRef.duration * 1000 - (appConfig.current.animate ? 500 : 0)
          : appConfig.current.slideLength
      );

      if (next === 0) {
        setShowMiddleItems(false);
        setTimeout(
          () => setShowMiddleItems(true),
          appConfig.current.slideLength / 2
        );
      }
      return next;
    });
  }, []);

  // Executed on first load.
  // Fetch image list from Google Drive; populate imgUrls.
  useEffect(() => {
    async function fetchConfig() {
      try {
        const config = await getAppConfig();
        appConfig.current = config;
        fetchMedia();

        if (config.refetchInterval) {
          setInterval(fetchMedia, config.refetchInterval);
        }
      } catch (error) {
        setSetupError(error as ParamError);
      }
    }
    fetchConfig();
  }, []);

  return (
    <div
      id="rotation-container"
      style={getRotationContainerStyle(appConfig.current?.rotation ?? 0)}
    >
      {(() => {
        if (setupError) {
          return <ErrorMessageBox error={setupError} />;
        }

        if (
          appConfig.current &&
          mediaEntries.current &&
          mediaEntries.current.length > 0
        ) {
          return mediaEntries.current.map(({ mimeType, url }, index) => {
            const commonProps = {
              src: url,
              style: {
                opacity:
                  index >= shownIndex &&
                  (index === 0 ||
                    index === mediaEntries.current.length - 1 ||
                    showMiddleItems)
                    ? 1
                    : 0,
                zIndex: -index,
                transition: appConfig.current!.animate
                  ? "opacity 0.5s"
                  : undefined,
              },
              className: "slide-img",
            } as const;

            return (
              <Fragment key={url}>
                {mimeType.startsWith("video") ? (
                  <video
                    {...commonProps}
                    ref={(element) => {
                      if (element) videoRefs.current[url] = element;
                    }}
                  />
                ) : (
                  <img {...commonProps} />
                )}
              </Fragment>
            );
          });
        }

        return <BarLoader color="#ffffff" />;
      })()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("slideshow-container")!).render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
