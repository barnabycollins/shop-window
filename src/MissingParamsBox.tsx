type ErrorMessageProps = {
  missingParams: string[];
  optionalParams: readonly string[];
  givenParams: { [key: string]: string };
};

export function MissingParamsBox({
  missingParams,
  optionalParams,
  givenParams,
}: ErrorMessageProps) {
  return (
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
        {optionalParams.map((p) => (
          <li key={p} className={givenParams[p] ? "italic" : undefined}>{`${p}${
            givenParams[p] ? `: ${givenParams[p]}` : ""
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
  );
}
