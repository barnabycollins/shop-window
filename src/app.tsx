import ReactDOM from "react-dom/client";
import { StrictMode, useEffect, useState } from "react";
import { getQueryParams } from "./getQueryParams";
import { BarLoader } from "react-spinners";
import {
  FilesListResponse,
  GOOGLE_DRIVE_EXPANDED_FILE_FIELDS,
} from "./googleDriveTypes";

const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
const OPTIONAL_PARAMS = [
  "rotation",
  "slideLength",
  "sharedDriveId",
  "animate",
  "refetchInterval",
] as const;

const rotationMap: { [key: string]: string } = {
  "90": "90",
  "180": "180",
  "270": "270",
  "-90": "270",
};

const { params, missingParams } = getQueryParams(
  REQUIRED_PARAMS,
  OPTIONAL_PARAMS
);

const apiUrl =
  `https://www.googleapis.com/drive/v3/files?` +
  new URLSearchParams({
    key: params.googleApiKey,
    q: `'${params.driveFolderId}' in parents and trashed = false`,
    fields: `files(${GOOGLE_DRIVE_EXPANDED_FILE_FIELDS.join(",")})`,
    ...(params.sharedDriveId
      ? {
          includeItemsFromAllDrives: "true",
          supportsAllDrives: "true",
          driveId: params.sharedDriveId,
          corpora: "drive",
        }
      : {}),
  });

const slideLength =
  (params.slideLength ? Math.max(parseInt(params.slideLength, 10), 1) : 30) *
  1000;

const refetchInterval = params.refetchInterval
  ? parseInt(params.refetchInterval, 10) * 60 * 1000
  : undefined;

const animate = params.animate === "false" ? false : true;

const rotation =
  params.rotation && params.rotation in rotationMap
    ? rotationMap[params.rotation]
    : undefined;

const IsRotated90Deg = rotation === "90" || rotation === "270";

const rotationContainerStyle = {
  ...(rotation
    ? {
        transform: `rotate(${rotation}deg)`,
      }
    : {}),
  ...(IsRotated90Deg
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
        <div className="error-msg">
          <h1>Shop Window App: Error</h1>
          <p>The following required input(s) are missing from the URL:</p>
          <ul className="mono">
            {missingParams.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p>Please add them to the URL, in the format: </p>
          <p className="mono">
            https://url.for.page/?name1=value1&name2=value2&name3=value3
          </p>
          <p>You can also provide the following optional inputs:</p>
          <ul className="mono">
            {OPTIONAL_PARAMS.map((p) => (
              <li key={p} className={params[p] ? "italic" : undefined}>{`${p}${
                params[p] ? `: ${params[p]}` : ""
              }`}</li>
            ))}
          </ul>
          <p>
            For more information, visit the{" "}
            <a
              href="https://github.com/barnabycollins/shop-window/blob/main/README.md"
              target="_blank"
              rel="noreferrer"
            >
              project documentation
            </a>{" "}
            on GitHub.
          </p>
        </div>
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
