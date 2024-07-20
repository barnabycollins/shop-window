import {
  FilesListResponse,
  getGoogleDriveDownloadUrl,
  GOOGLE_DRIVE_EXPANDED_FILE_FIELDS,
} from "./googleDriveConstants";
import { Assert, ExactProps, Int, ThrowError } from "ts-runtime-checks";

const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
type RequiredParam = (typeof REQUIRED_PARAMS)[number];

const OPTIONAL_PARAMS = [
  "rotation",
  "slideLength",
  "sharedDriveId",
  "animate",
  "refetchInterval",
  "enabledMimeTypes",
] as const;
type OptionalParam = (typeof OPTIONAL_PARAMS)[number];

const NUMERIC_PARAMS: (RequiredParam | OptionalParam)[] = [
  "rotation",
  "slideLength",
  "refetchInterval",
];

const BOOLEAN_PARAMS: (RequiredParam | OptionalParam)[] = ["animate"];

type JsonParamSchema = {
  rotation?: 0 | 90 | 180 | 270;
  slideLength?: Int;
  animate?: boolean;
  refetchInterval?: Int;
  enabledMimeTypes?: string[];
};

type UrlParamsSchema = JsonParamSchema & {
  googleApiKey: string;
  driveFolderId: string;
  sharedDriveId?: string;
};

export type AppConfig = {
  rotation: 0 | 90 | 180 | 270;
  slideLength: number;
  animate: boolean;
  refetchInterval?: number;
  enabledMimeTypes: string[];
};

type AppConfigWithMediaUrls = AppConfig & {
  mediaUrls: string[];
};

const defaultConfig: AppConfig = {
  slideLength: 30,
  animate: true,
  rotation: 0,
  enabledMimeTypes: [
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
  ],
};

export class ParamValidationError extends Error {
  constructor(message: any) {
    super(message);
    this.name = "ParamValidationError";
  }
}

function parseBoolean(input: string) {
  if (input === "true") return true;
  if (input === "false") return false;
  return null;
}

function getQueryParams(): UrlParamsSchema {
  const urlSearch = new URLSearchParams(window.location.search);
  let receivedParams: { [k: string]: string } = {};

  const missingParams: string[] = [];

  REQUIRED_PARAMS.forEach((name) => {
    const value = urlSearch.get(name);
    if (!value) missingParams.push(name);
    else receivedParams[name] = value;
  });

  if (missingParams.length > 0) {
    throw new ParamValidationError(missingParams);
  }

  OPTIONAL_PARAMS.forEach((name) => {
    const value = urlSearch.get(name);
    if (value) receivedParams[name] = value;
  });

  const finalParams = Object.fromEntries(
    Object.entries(receivedParams)
      .map(([key, value]) => {
        if (key in NUMERIC_PARAMS)
          return [key, Number(value)] as [string, number];
        if (key in BOOLEAN_PARAMS)
          return [key, parseBoolean(value)] as [string, boolean | null];
        return [key, value] as [string, string];
      })
      .filter(
        (entry) =>
          !(
            [null, undefined] as (
              | string
              | number
              | boolean
              | null
              | undefined
            )[]
          ).includes(entry[1])
      )
  ) as Assert<
    ExactProps<UrlParamsSchema, true, true>,
    ThrowError<ParamValidationError>
  >;

  return finalParams;
}

export async function getConfig(): Promise<AppConfigWithMediaUrls> {
  const urlParamsConfig = getQueryParams();

  const apiUrl =
    `https://www.googleapis.com/drive/v3/files?` +
    new URLSearchParams({
      key: urlParamsConfig.googleApiKey,
      q: `'${urlParamsConfig.driveFolderId}' in parents and trashed = false`,
      fields: `files(${GOOGLE_DRIVE_EXPANDED_FILE_FIELDS.join(",")})`,
      ...(urlParamsConfig.sharedDriveId
        ? {
            includeItemsFromAllDrives: "true",
            supportsAllDrives: "true",
            driveId: urlParamsConfig.sharedDriveId,
            corpora: "drive",
          }
        : {}),
    });

  const response = await fetch(apiUrl);
  const imageBody = (await response.json()) as FilesListResponse;

  const jsonFiles = imageBody.files.filter(
    (f) => f.mimeType === "application/json"
  );

  let jsonConfig: JsonParamSchema = {};

  if (jsonFiles.length > 0) {
    for (const file of jsonFiles) {
      let fileResponse: Response;
      let fileContent: JsonParamSchema = {};

      try {
        fileResponse = await fetch(getGoogleDriveDownloadUrl(file.id));
      } catch (e) {
        console.error(
          `Failed to retrieve JSON configuration file with ID ${file.id}:`,
          e
        );
      }
      try {
        fileContent = await response.json();
      } catch (e) {
        console.error(`Failed to parse JSON file!`);
      }

      try {
        fileContent = fileContent as Assert<
          ExactProps<JsonParamSchema, true, true>
        >;
      } catch (e) {
        console.error(
          `Found invalid value(s) in JSON file with ID ${file.id}:`,
          e
        );
      }

      jsonConfig = {
        ...jsonConfig,
        ...fileContent,
      };
    }
  }

  const resolvedConfig: AppConfig = {
    ...defaultConfig,
    ...urlParamsConfig,
    ...jsonConfig,
  };

  resolvedConfig.slideLength *= 1000;
  if (resolvedConfig.refetchInterval)
    resolvedConfig.refetchInterval *= 60 * 1000;

  return {
    ...resolvedConfig,
    mediaUrls: imageBody.files
      .filter((f) => resolvedConfig.enabledMimeTypes.includes(f.mimeType))
      .map((f) => getGoogleDriveDownloadUrl(f.id)),
  };
}
