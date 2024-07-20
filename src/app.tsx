import ReactDOM from "react-dom/client";
import { StrictMode, useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import { AppConfig, getAppConfig, RotationValue } from "./appConfig";
import { MissingParamsBox } from "./MissingParamsBox";
import { MissingParamsError, ParamValidationError } from "./errors";

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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const [shownIndex, setShownIndex] = useState(0);

  const [showMiddleItems, setShowMiddleItems] = useState(true);

  const [appConfig, setAppConfig] = useState<AppConfig | undefined>(undefined);

  const [setupError, setSetupError] = useState<
    Error | MissingParamsError | ParamValidationError | undefined
  >(undefined);

  // Executed on first load.
  // Fetch image list from Google Drive; populate imgUrls.
  useEffect(() => {
    async function fetchImages() {
      try {
        const { mediaUrls, ...config } = await getAppConfig();
        setMediaUrls(mediaUrls);
        setAppConfig(config);

        if (config.refetchInterval) {
          const interval = setInterval(fetchImages, config.refetchInterval);
          return () => {
            clearInterval(interval);
          };
        }
      } catch (error) {
        setSetupError(error as Error);
      }
    }
    fetchImages();
  }, []);

  // Executed once images are loaded.
  // Sets an interval to trigger the slideshow.
  useEffect(() => {
    if (appConfig && mediaUrls.length > 0) {
      const interval = setInterval(() => {
        setShownIndex((current) => {
          const next = (current + 1) % mediaUrls.length;
          if (next === 0) {
            setShowMiddleItems(false);
            setTimeout(
              () => setShowMiddleItems(true),
              appConfig.slideLength / 2
            );
          }
          return next;
        });
      }, appConfig.slideLength);

      return () => {
        clearInterval(interval);
      };
    }
  }, [appConfig, mediaUrls]);

  return (
    <div
      id="rotation-container"
      style={getRotationContainerStyle(appConfig?.rotation ?? 0)}
    >
      {(() => {
        if (setupError) {
          if ("id" in setupError) {
            if (setupError.id === "MissingParams") {
              return (
                <MissingParamsBox
                  missingParams={setupError.missingParams}
                  givenParams={setupError.givenParams}
                  optionalParams={setupError.optionalParams}
                />
              );
            }
          }

          return setupError.toString();
        }

        if (appConfig) {
          return mediaUrls.map((url, index) => (
            <img
              key={url}
              className="slide-img"
              style={{
                opacity:
                  index >= shownIndex &&
                  (index === 0 ||
                    index === mediaUrls.length - 1 ||
                    showMiddleItems)
                    ? 1
                    : 0,
                zIndex: -index,
                transition: appConfig ? "opacity 0.5s" : undefined,
              }}
              src={url}
            />
          ));
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
