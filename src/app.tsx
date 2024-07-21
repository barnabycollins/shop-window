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
  MediaEntry,
  RotationValue,
} from "./appConfig";
import { ErrorMessageBox } from "./MissingParamsBox";
import { ParamError } from "./errors";

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
  const videoRefs = useRef<{ [url: string]: HTMLVideoElement }>({});

  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([]);

  const [shownIndex, setShownIndex] = useState(0);

  const [showMiddleItems, setShowMiddleItems] = useState(true);

  const [appConfig, setAppConfig] = useState<AppConfig | undefined>(undefined);

  const [setupError, setSetupError] = useState<ParamError | undefined>(
    undefined
  );

  const showNextMediaItem = useCallback(
    (c: AppConfig, m: MediaEntry[]) => {
      console.log("showing next item");
      setShownIndex((current) => {
        const next = (current + 1) % m.length;

        const nextEntry = m[next];

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
          () => showNextMediaItem(c, m),
          videoRef
            ? videoRef.duration * 1000 - (c.animate ? 500 : 0)
            : c.slideLength
        );

        if (next === 0) {
          setShowMiddleItems(false);
          setTimeout(() => setShowMiddleItems(true), c.slideLength / 2);
        }
        return next;
      });
    },
    [appConfig, mediaEntries]
  );

  // Executed on first load.
  // Fetch image list from Google Drive; populate imgUrls.
  useEffect(() => {
    async function fetchImages() {
      try {
        const { mediaEntries: mediaUrls, ...config } = await getAppConfig();
        setMediaEntries(mediaUrls);
        setAppConfig(config);

        let interval: number | undefined;

        if (config.refetchInterval) {
          interval = setInterval(fetchImages, config.refetchInterval);
        }

        showNextMediaItem(config, mediaUrls);
      } catch (error) {
        setSetupError(error as ParamError);
      }
    }
    fetchImages();
  }, []);

  return (
    <div
      id="rotation-container"
      style={getRotationContainerStyle(appConfig?.rotation ?? 0)}
    >
      {(() => {
        if (setupError) {
          return <ErrorMessageBox error={setupError} />;
        }

        if (appConfig) {
          return mediaEntries.map(({ mimeType, url }, index) => {
            const commonProps = {
              src: url,
              style: {
                opacity:
                  index >= shownIndex &&
                  (index === 0 ||
                    index === mediaEntries.length - 1 ||
                    showMiddleItems)
                    ? 1
                    : 0,
                zIndex: -index,
                transition: appConfig.animate ? "opacity 0.5s" : undefined,
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
  <StrictMode>
    <App />
  </StrictMode>
);
