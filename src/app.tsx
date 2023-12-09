import ReactDOM from "react-dom/client";
import { StrictMode, useEffect, useState } from "react";
import { drive } from "@googleapis/drive";
import { getQueryParams } from "./getQueryParams";
import { BarLoader } from "react-spinners";

const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
const OPTIONAL_PARAMS = ["rotation"] as const;

const { params, missingParams } = getQueryParams(
  REQUIRED_PARAMS,
  OPTIONAL_PARAMS
);

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const client = drive({ version: "v3", auth: params.googleApiKey });
    const getStuff = async () => {
      const response = await client.files.list({
        q: `'${params.driveFolderId}' in parents and trashed = false`,
      });
      console.log(response);
    };

    getStuff();
  }, []);

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
    <h1>yes!</h1>
  ) : (
    <BarLoader color="#ffffff" />
  );
}

ReactDOM.createRoot(document.getElementById("slideshow-container")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
