import ReactDOM from "react-dom/client";
import { CSSProperties, StrictMode, useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import {
  params,
  missingParams,
  apiUrl,
  slideLength,
  refetchInterval,
  animate,
  rotation,
  OPTIONAL_PARAMS,
} from "./getParams";
import { FilesListResponse } from "./googleDriveTypes";
import { MissingParamsBox } from "./MissingParamsBox";

const rotationContainerStyle: CSSProperties = {
  ...(rotation
    ? {
        transform: `rotate(${rotation}deg)`,
      }
    : {}),
  ...(rotation === "90" || rotation === "270"
    ? {
        height: "100vw",
        width: "100vh",
      }
    : {
        height: "100vh",
        width: "100vw",
      }),
};

const supportedMimeTypes = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
];

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  const [imgUrls, setImgUrls] = useState<string[]>([]);

  const [shownIndex, setShownIndex] = useState(0);

  const [showMiddleItems, setShowMiddleItems] = useState(true);

  // Executed on first load.
  // Fetch image list from Google Drive; populate imgUrls.
  useEffect(() => {
    async function fetchImages() {
      const response = await fetch(apiUrl);
      const body = (await response.json()) as FilesListResponse;

      setImgUrls(
        body.files
          .filter((f) => supportedMimeTypes.includes(f.mimeType))
          .map((f) => `https://lh3.googleusercontent.com/d/${f.id}`)
      );

      setIsLoaded(true);
    }

    if (missingParams.length === 0) {
      fetchImages();

      if (refetchInterval) {
        const interval = setInterval(fetchImages, refetchInterval);
        return () => {
          clearInterval(interval);
        };
      }
    }
  }, []);

  // Executed once images are loaded.
  // Sets an interval to trigger the slideshow.
  useEffect(() => {
    if (isLoaded && imgUrls.length > 0) {
      const interval = setInterval(() => {
        setShownIndex((current) => {
          const next = (current + 1) % imgUrls.length;
          if (next === 0) {
            setShowMiddleItems(false);
            setTimeout(() => setShowMiddleItems(true), slideLength / 2);
          }
          return next;
        });
      }, slideLength);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoaded]);

  return (
    <div id="rotation-container" style={rotationContainerStyle}>
      {missingParams.length > 0 ? (
        <MissingParamsBox
          missingParams={missingParams}
          optionalParams={OPTIONAL_PARAMS}
          givenParams={params}
        />
      ) : isLoaded ? (
        imgUrls.map((url, index) => (
          <img
            className="slide-img"
            style={{
              opacity:
                index >= shownIndex &&
                (index === 0 || index === imgUrls.length - 1 || showMiddleItems)
                  ? 1
                  : 0,
              zIndex: -index,
              transition: animate ? "opacity 0.5s" : undefined,
            }}
            key={url}
            src={url}
          />
        ))
      ) : (
        <BarLoader color="#ffffff" />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("slideshow-container")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
