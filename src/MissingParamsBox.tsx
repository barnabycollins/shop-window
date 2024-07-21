import {
  issueFeedback,
  MissingParamsError,
  ParamError,
  ParamValidationError,
} from "./errors";

type ErrorMessageBoxProps = {
  error: ParamError;
};

function MissingParamsContent({ error }: { error: MissingParamsError }) {
  const { optionalParams, givenParams, missingParams } = error;

  const optionalSetParams = optionalParams.filter(
    (p) => p in givenParams && givenParams[p] !== undefined
  );
  const optionalUnsetParams = optionalParams.filter(
    (p) => !optionalSetParams.includes(p)
  );

  return (
    <>
      <p>The following required input(s) are missing from the URL:</p>
      <ul className="mono">
        {missingParams.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p>Please add them to the URL, in the format: </p>
      <p className="mono">
        https://url.for.page/?
        <span className="emphasis">name1=value1&name2=value2&name3=value3</span>
      </p>
      {optionalSetParams.length > 0 && (
        <>
          <p>You have provided the following optional inputs:</p>
          <ul className="mono">
            {optionalSetParams.map((p) => (
              <li key={p}>{`${p}: ${givenParams[p]}`}</li>
            ))}
          </ul>
        </>
      )}
      {optionalUnsetParams.length > 0 && (
        <>
          <p>You can also provide the following optional inputs:</p>
          <ul className="mono">
            {optionalUnsetParams.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
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
    </>
  );
}

function ParamValidationContent({ error }: { error: ParamValidationError }) {
  return (
    <>
      <p>
        Failed to validate the following fields when{" "}
        {(() => {
          switch (error.context.stage) {
            case "urlParams": {
              return "reading provided URL parameters";
            }
            case "jsonParams": {
              return `parsing JSON file "${error.context.fileName}" from the provided Google Drive folder`;
            }
            case "finalCheck": {
              return `performing final check`;
            }
          }
        })()}
        :
      </p>
      <ul className="mono">
        {error.zodError.issues.map((issue) => (
          <li key={`${issue.path.join(".")} ${issue.code}`}>
            {issueFeedback(issue)}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ErrorMessageBox({ error }: ErrorMessageBoxProps) {
  return (
    <div className="error-msg">
      <h1>Shop Window App: Error</h1>
      {(() => {
        switch (error.name) {
          case "MissingParamsError": {
            return <MissingParamsContent error={error} />;
          }
          case "ParamValidationError": {
            return <ParamValidationContent error={error} />;
          }
          default: {
            return error.toString();
          }
        }
      })()}
    </div>
  );
}
