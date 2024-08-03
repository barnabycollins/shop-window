import ReactDOM from "react-dom/client";
import { StrictMode, useCallback, useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import {
  AppConfig,
  getAppConfig,
  getMediaEntries,
  MediaEntryWithElement,
  RotationValue,
} from "./appConfig";
import { ErrorMessageBox } from "./MissingParamsBox";
import { MissingConfigError, ParamError } from "./errors";
import { MediaSlideshow } from "./MediaSlideshow";

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
  const [appConfig, setAppConfig] = useState<AppConfig | undefined>(undefined);

  const [mediaEntries, setMediaEntries] = useState<MediaEntryWithElement[]>([]);

  const [setupError, setSetupError] = useState<ParamError | undefined>(
    undefined
  );

  const fetchMediaList = useCallback(
    async (config: AppConfig, signal: AbortSignal) => {
      if (!config) throw new MissingConfigError("fetchMediaList()", config);

      const entries = await getMediaEntries(config, signal);

      setMediaEntries(entries);
    },
    []
  );

  useEffect(() => {
    const abortController = new AbortController();

    let clearMediaTimeout: (() => void) | undefined;

    async function setUp(signal: AbortSignal) {
      return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          return reject(signal.reason);
        }

        getAppConfig(signal)
          .then(async (config) => {
            setAppConfig(config);

            await fetchMediaList(config, signal);

            setSetupError(undefined);

            resolve();
          })
          .catch((error) => {
            setSetupError(error as ParamError);
            return resolve();
          });

        signal.addEventListener("abort", () => {
          reject(signal.reason);
        });
      });
    }
    setUp(abortController.signal);

    return () => {
      abortController.abort();
      if (clearMediaTimeout !== undefined) clearMediaTimeout();
    };
  }, []);

  useEffect(() => {
    if (appConfig?.refetchInterval) {
      const abortController = new AbortController();
      let interval = setInterval(() => {
        fetchMediaList(appConfig, abortController.signal);
      }, appConfig.refetchInterval);

      return () => {
        abortController.abort();
        clearInterval(interval);
      };
    }
  }, [appConfig?.refetchInterval]);

  return (
    <div
      id="rotation-container"
      style={getRotationContainerStyle(appConfig?.rotation ?? 0)}
    >
      {(() => {
        if (setupError) {
          return <ErrorMessageBox error={setupError} />;
        }

        if (appConfig && mediaEntries && Object.keys(mediaEntries).length > 0) {
          return (
            <MediaSlideshow config={appConfig} mediaEntries={mediaEntries} />
          );
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
