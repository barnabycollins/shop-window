import ReactDOM from "react-dom/client";
import React from "react";
import { drive } from "@googleapis/drive";
import { getQueryParams } from "./getQueryParams";

const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
const OPTIONAL_PARAMS = ["rotation"] as const;

const { params, missingParams } = getQueryParams(
  REQUIRED_PARAMS,
  OPTIONAL_PARAMS
);

function App() {
  return missingParams.length > 0 ? (
    <div className="error-msg">
      <div>
        <h1>Shop Window App: Error</h1>
        <p>The following parameters are missing from the URL:</p>
        <ul>
          {missingParams.map((name) => (
            <li>{name}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : (
    <h1>happy now</h1>
  );
}

ReactDOM.createRoot(document.getElementById("slideshow-container")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
