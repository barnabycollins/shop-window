import { z } from "zod";
import {
  FilesListResponse,
  getGoogleDriveFile,
  getGoogleDriveHostUrl,
  listGoogleDriveFilesUrl,
} from "./googleDrive";
import { oneOf } from "./paramValidation";
import { throwCustomError } from "./errors";

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

const rotationValues = [0, 90, 180, 270] as const;
export type RotationValue = (typeof rotationValues)[number];

const BOOLEAN_PARAMS: (RequiredParam | OptionalParam)[] = ["animate"];

const jsonParamSchema = z
  .object({
    rotation: oneOf(rotationValues),
    slideLength: z.number().int().gt(5),
    animate: z.boolean(),
    refetchInterval: z.number().int().gt(1),
    enabledMimeTypes: z.string().min(3).array(),
  })
  .partial();

const urlParamSchema = jsonParamSchema.extend({
  googleApiKey: z.string().min(1),
  driveFolderId: z.string().min(1),
  sharedDriveId: z.optional(z.string().min(1)),
});

const appConfigSchema = urlParamSchema
  .required()
  .extend({
    refetchInterval: z.optional(z.number().int().gt(1)),
  })
  .omit({
    googleApiKey: true,
    driveFolderId: true,
    sharedDriveId: true,
  });

type JsonParams = z.infer<typeof jsonParamSchema>;

type UrlParams = z.infer<typeof urlParamSchema>;

export type AppConfig = z.infer<typeof appConfigSchema>;

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

function parseBoolean(input: string) {
  if (input === "true") return true;
  if (input === "false") return false;
  return null;
}

function getQueryParams(): UrlParams {
  const urlSearch = new URLSearchParams(window.location.search);
  let receivedParams: { [k: string]: string } = {};

  REQUIRED_PARAMS.forEach((name) => {
    const value = urlSearch.get(name);
    if (value) receivedParams[name] = value;
  });

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
  );

  const result = urlParamSchema.safeParse(finalParams);

  if (!result.success) throwCustomError(result.error, { stage: "urlParams" });

  return finalParams as UrlParams;
}

export async function getAppConfig(): Promise<AppConfigWithMediaUrls> {
  const urlParamsConfig = getQueryParams();

  const response = await fetch(
    listGoogleDriveFilesUrl(
      urlParamsConfig.googleApiKey,
      urlParamsConfig.driveFolderId,
      urlParamsConfig.sharedDriveId
    )
  );
  const mediaListBody = (await response.json()) as FilesListResponse;

  const jsonFiles = mediaListBody.files.filter(
    (f) => f.mimeType === "application/json"
  );

  let jsonConfig: JsonParams = {};

  if (jsonFiles.length > 0) {
    for (const file of jsonFiles) {
      let currentFileContent: JsonParams = {};

      try {
        const fileResponse = await fetch(
          getGoogleDriveFile(urlParamsConfig.googleApiKey, file.id)
        );

        try {
          currentFileContent = await fileResponse.json();

          const result = jsonParamSchema.safeParse(currentFileContent);

          if (!result.success)
            throwCustomError(result.error, {
              stage: "jsonParams",
              fileName: file.name,
            });
        } catch (e) {
          console.error(`Failed to parse JSON file ${file.name}!`);
        }
      } catch (e) {
        console.error(
          `Failed to retrieve JSON configuration file ${file.name}:`,
          e
        );
      }

      jsonConfig = {
        ...jsonConfig,
        ...currentFileContent,
      };
    }
  }

  const resolvedConfig: AppConfig = {
    ...defaultConfig,
    ...urlParamsConfig,
    ...jsonConfig,
  };

  const result = appConfigSchema.safeParse(resolvedConfig);

  if (!result.success) throwCustomError(result.error, { stage: "finalCheck" });

  resolvedConfig.slideLength *= 1000;
  if (resolvedConfig.refetchInterval)
    resolvedConfig.refetchInterval *= 60 * 1000;

  console.debug(`Resolved app config:`, resolvedConfig);

  return {
    ...resolvedConfig,
    mediaUrls: mediaListBody.files
      .filter((f) => resolvedConfig.enabledMimeTypes.includes(f.mimeType))
      .map((f) => getGoogleDriveHostUrl(f.id)),
  };
}
