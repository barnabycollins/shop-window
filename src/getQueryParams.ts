export function getQueryParams<R extends string, O extends string>(
  required: readonly R[],
  optional: readonly O[]
) {
  type Return = {
    params: Record<R, string> & Partial<Record<O, string>>;
    missingParams: R[];
  };

  const params: Partial<Record<R | O, string>> = {};

  const urlSearch = new URLSearchParams(window.location.search);

  const missingParams: string[] = [];

  required.forEach((name) => {
    const value = urlSearch.get(name);
    if (!value) missingParams.push(name);
    else params[name] = value;
  });

  optional.forEach((name) => {
    const value = urlSearch.get(name);
    if (value) params[name] = value;
  });

  return { params, missingParams } as Return;
}
