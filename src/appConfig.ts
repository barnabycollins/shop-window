import { z } from "zod";
import {
  FilesListResponse,
  getGoogleDriveFile,
  getGoogleDriveHostUrl,
  listGoogleDriveFilesUrl,
} from "./googleDrive";
import { oneOf } from "./paramValidation";
import { issueFeedback, throwParamValidationError } from "./errors";

const REQUIRED_PARAMS = ["googleApiKey", "driveFolderId"] as const;
type RequiredParam = (typeof REQUIRED_PARAMS)[number];
const OPTIONAL_PARAMS = [
  "rotation",
  "slideLength",
  "sharedDriveId",
  "animate",
  "enableRefetch",
  "refetchInterval",
  "enabledMimeTypes",
  "strictJsonParsing",
] as const;
type OptionalParam = (typeof OPTIONAL_PARAMS)[number];

const NUMERIC_PARAMS: (RequiredParam | OptionalParam)[] = [
  "rotation",
  "slideLength",
  "refetchInterval",
];

const rotationValues = [0, 90, 180, 270] as const;
export type RotationValue = (typeof rotationValues)[number];

const BOOLEAN_PARAMS: (RequiredParam | OptionalParam)[] = [
  "animate",
  "enableRefetch",
  "strictJsonParsing",
];

const jsonParamSchema = z
  .object({
    rotation: oneOf(rotationValues),
    slideLength: z.number().int().gt(5),
    animate: z.boolean(),
    enableRefetch: z.boolean(),
    refetchInterval: z.number().int().gt(1),
    enabledMimeTypes: z.string().min(3).array(),
  })
  .partial();

const urlParamSchema = jsonParamSchema.extend({
  googleApiKey: z.string().min(1),
  driveFolderId: z.string().min(1),
  sharedDriveId: z.optional(z.string().min(1)),
  strictJsonParsing: z.optional(z.boolean()),
});

const appConfigSchema = urlParamSchema.required().omit({
  googleApiKey: true,
  driveFolderId: true,
  sharedDriveId: true,
  strictJsonParsing: true,
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
  enableRefetch: false,
  refetchInterval: 3,
  enabledMimeTypes: [
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
  ],
};

function attemptToParseBoolean(input: string) {
  if (input === "true") return true;
  if (input === "false") return false;
  return input;
}

function attemptToParseNumber(input: string) {
  const output = Number(input);
  if (Number.isNaN(output)) {
    return input;
  }
  return output;
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
        if ((NUMERIC_PARAMS as string[]).includes(key))
          return [key, attemptToParseNumber(value)] as [string, number];
        if ((BOOLEAN_PARAMS as string[]).includes(key))
          return [key, attemptToParseBoolean(value)] as [
            string,
            boolean | null,
          ];
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

  const validationResult = urlParamSchema.safeParse(finalParams);

  if (!validationResult.success)
    throwParamValidationError(validationResult.error, { stage: "urlParams" });

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
          console.debug(`Loaded "${file.name}": `, currentFileContent);
        } catch (e) {
          console.error(`Failed to parse JSON file ${file.name}!`);
        }
      } catch (e) {
        console.error(
          `Failed to retrieve JSON configuration file ${file.name}:`,
          e
        );
      }

      const validationResult = jsonParamSchema.safeParse(currentFileContent);

      if (!validationResult.success) {
        if (urlParamsConfig.strictJsonParsing === true) {
          throwParamValidationError(validationResult.error, {
            stage: "jsonParams",
            fileName: file.name,
          });
        } else {
          console.error(
            `Failed to parse ${file.name}:`,
            validationResult.error.issues.map((i) => issueFeedback(i))
          );
          currentFileContent = Object.fromEntries(
            Object.entries(currentFileContent).filter(
              ([key]) =>
                !validationResult.error.issues.some(
                  (issue) => issue.path[0] === key
                )
            )
          );
        }
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

  const validationResult = appConfigSchema.safeParse(resolvedConfig);

  if (!validationResult.success)
    throwParamValidationError(validationResult.error, { stage: "finalCheck" });

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
