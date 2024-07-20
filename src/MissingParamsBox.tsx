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
  const optionalSetParams = optionalParams.filter(
    (p) => p in givenParams && givenParams[p] !== undefined
  );

  const optionalUnsetParams = optionalParams.filter(
    (p) => !optionalSetParams.includes(p)
  );

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
    </div>
  );
}
