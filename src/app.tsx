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

const slideLength = params.slideLength ? parseInt(params.slideLength, 10) : 30;

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  const [imgUrls, setImgUrls] = useState<string[]>([]);

  const [shownIndex, setShownIndex] = useState(0);

  useEffect(() => {
    async function getStuff() {
      console.log("fetching");
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
          new URLSearchParams({
            key: params.googleApiKey,
            q: `'${params.driveFolderId}' in parents and trashed = false`,
          })
      );

      const body = (await response.json()) as FilesListResponse;

      setImgUrls(
        body.files.map(
          (f) => `https://drive.google.com/uc?export=view&id=${f.id}`
        )
      );

      setIsLoaded(true);
    }
    if (missingParams.length === 0) getStuff();
  }, []);

  useEffect(() => {
    if (isLoaded && imgUrls.length > 0) {
      const interval = setInterval(() => {
        setShownIndex((current) => (current + 1) % imgUrls.length);
      }, slideLength * 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoaded]);

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
          style={{ opacity: index >= shownIndex ? 1 : 0, zIndex: -index }}
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
