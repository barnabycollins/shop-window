import { GOOGLE_DRIVE_EXPANDED_FILE_FIELDS } from "./googleDriveTypes";

export const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
export const OPTIONAL_PARAMS = [
  "rotation",
  "slideLength",
  "sharedDriveId",
  "animate",
  "refetchInterval",
] as const;

function getQueryParams<R extends string, O extends string>(
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

  console.debug(`Received params:`, params);

  return { params, missingParams } as Return;
}

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

const rotationMap: { [key: string]: "90" | "180" | "270" } = {
  "90": "90",
  "180": "180",
  "270": "270",
  "-90": "270",
};

const rotation =
  params.rotation && params.rotation in rotationMap
    ? rotationMap[params.rotation]
    : undefined;

export {
  params,
  missingParams,
  apiUrl,
  slideLength,
  refetchInterval,
  animate,
  rotation,
};
