import ReactDOM from "react-dom/client";
import { StrictMode, useEffect, useState } from "react";
import { getQueryParams } from "./getQueryParams";
import { BarLoader } from "react-spinners";
import { FilesListResponse } from "./googleDriveTypes";

const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
const OPTIONAL_PARAMS = ["rotation", "slideLength"] as const;

const { params, missingParams } = getQueryParams(
  REQUIRED_PARAMS,
  OPTIONAL_PARAMS
);

const slideLength =
  (params.slideLength ? Math.max(parseInt(params.slideLength, 10), 1) : 30) *
  1000;

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

  const [showLowerItems, setShowLowerItems] = useState(true);

  useEffect(() => {
    async function fetchImages() {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
          new URLSearchParams({
            key: params.googleApiKey,
            q: `'${params.driveFolderId}' in parents and trashed = false`,
          })
      );

      const body = (await response.json()) as FilesListResponse;

      setImgUrls(
        body.files
          .filter((f) => supportedMimeTypes.includes(f.mimeType))
          .map(
            (f) =>
              `https://drive.google.com/uc?` +
              new URLSearchParams({ export: "view", id: f.id })
          )
      );

      setIsLoaded(true);
    }
    if (missingParams.length === 0) fetchImages();
  }, []);

  useEffect(() => {
    if (isLoaded && imgUrls.length > 0) {
      const interval = setInterval(() => {
        setShownIndex((current) => {
          const next = (current + 1) % imgUrls.length;
          if (next === 0) {
            setShowLowerItems(false);
          }
          return next;
        });
      }, slideLength);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoaded]);

  useEffect(() => {
    if (shownIndex === 0) {
      setTimeout(() => setShowLowerItems(true), slideLength / 2);
    }
  }, [shownIndex]);

  return missingParams.length > 0 ? (
    <div className="error-msg">
      <h1>Shop Window App: Error</h1>
      <p>The following parameter names are missing from the URL:</p>
      <ul className="mono">
        {missingParams.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p>
        Please add them again, in the format:{" "}
        <span className="mono">path.to/page?name1=value1&name2=value2</span>
      </p>
    </div>
  ) : isLoaded ? (
    <>
      {imgUrls.map((url, index) => (
        <img
          className="slide-img"
          style={{
            opacity:
              index >= shownIndex && (index === 0 || showLowerItems) ? 1 : 0,
            zIndex: -index,
          }}
          key={url}
          src={url}
        />
      ))}
    </>
  ) : (
    <BarLoader color="#ffffff" />
  );
}

ReactDOM.createRoot(document.getElementById("slideshow-container")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
