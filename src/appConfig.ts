import { z } from "zod";
import {
  FilesListResponse,
  getGoogleDriveFileWithApi,
  getGoogleDrivePublicImageUrl,
  listGoogleDriveFilesUrl,
} from "./googleDrive";
import { oneOf } from "./paramValidation";
import { issueFeedback, throwParamValidationError } from "./errors";

const rotationValues = [0, 90, 180, 270] as const;
export type RotationValue = (typeof rotationValues)[number];

const allConfigSchema = z.object({
  googleApiKey: z.string().min(1),
  driveFolderId: z.string().min(1),
  sharedDriveId: z.string().min(1),
  strictJsonParsing: z.boolean(),
  rotation: oneOf(rotationValues),
  slideLength: z.number().int().gte(5),
  enableRefetch: z.boolean(),
  refetchInterval: z.number().int().gte(1),
  enabledMimeTypes: z.string().min(3).array(),
  fadeTime: z.number().gte(0),
});

const urlParamSchema = allConfigSchema
  .partial()
  .required({ googleApiKey: true, driveFolderId: true });

const jsonParamSchema = allConfigSchema
  .omit({
    googleApiKey: true,
    driveFolderId: true,
    sharedDriveId: true,
    strictJsonParsing: true,
  })
  .partial();

const defaultConfigSchema = allConfigSchema.omit({
  googleApiKey: true,
  driveFolderId: true,
  sharedDriveId: true,
});

const appConfigSchema = urlParamSchema
  .omit({
    strictJsonParsing: true,
  })
  .required()
  .partial({ sharedDriveId: true });

type ParamNameArray = (keyof z.infer<typeof allConfigSchema>)[];

type JsonParams = z.infer<typeof jsonParamSchema>;

type UrlParams = z.infer<typeof urlParamSchema>;

type DefaultConfig = z.infer<typeof defaultConfigSchema>;

export type AppConfig = z.infer<typeof appConfigSchema>;

const REQUIRED_PARAMS: ParamNameArray = ["googleApiKey", "driveFolderId"];

const OPTIONAL_PARAMS: ParamNameArray = [
  "rotation",
  "slideLength",
  "sharedDriveId",
  "enableRefetch",
  "refetchInterval",
  "enabledMimeTypes",
  "strictJsonParsing",
];

const NUMERIC_PARAMS: ParamNameArray = [
  "fadeTime",
  "rotation",
  "slideLength",
  "refetchInterval",
];

const BOOLEAN_PARAMS: ParamNameArray = ["enableRefetch", "strictJsonParsing"];

type MediaMimeType = `${"video" | "image"}/${string}`;

type MediaEntry = {
  url: string;
  mimeType: MediaMimeType;
  name: string;
};

export type MediaEntryWithElement = MediaEntry & {
  element?: HTMLVideoElement | HTMLImageElement;
};

const defaultConfig: DefaultConfig = {
  slideLength: 30,
  rotation: 0,
  enableRefetch: false,
  refetchInterval: 3,
  strictJsonParsing: false,
  fadeTime: 0.5,
  enabledMimeTypes: [
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "video/mp4",
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

  console.debug("Resolved URL params:", finalParams);

  return finalParams as UrlParams;
}

export async function getAppConfig(signal: AbortSignal): Promise<AppConfig> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
    }

    const urlParamsConfig = getQueryParams();

    fetch(
      listGoogleDriveFilesUrl(
        urlParamsConfig.googleApiKey,
        urlParamsConfig.driveFolderId,
        ["application/json"],
        urlParamsConfig.sharedDriveId
      ),
      { signal }
    ).then(async (response) => {
      const jsonFiles = (await response.json()) as FilesListResponse;

      let jsonConfig: JsonParams = {};

      if (jsonFiles.files.length > 0) {
        for (const file of jsonFiles.files) {
          let currentFileContent: JsonParams = {};

          try {
            const fileResponse = await fetch(
              getGoogleDriveFileWithApi(urlParamsConfig.googleApiKey, file.id),
              { signal }
            );

            try {
              currentFileContent = await fileResponse.json();
              console.debug(
                `Resolved "${file.name}" from Drive folder: `,
                currentFileContent
              );
            } catch (e) {
              console.error(`Failed to parse JSON file ${file.name}!`);
            }
          } catch (e) {
            console.error(
              `Failed to retrieve JSON configuration file ${file.name}:`,
              e
            );
          }

          const validationResult =
            jsonParamSchema.safeParse(currentFileContent);

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

      const mergedConfig: AppConfig = {
        ...defaultConfig,
        ...urlParamsConfig,
        ...jsonConfig,
      };

      const validationResult = appConfigSchema.safeParse(mergedConfig);

      if (!validationResult.success)
        throwParamValidationError(validationResult.error, {
          stage: "finalCheck",
        });

      mergedConfig.slideLength *= 1000;
      if (mergedConfig.refetchInterval)
        mergedConfig.refetchInterval *= 60 * 1000;

      console.debug(`Resolved app config, including defaults:`, mergedConfig);

      return resolve(mergedConfig);
    });

    signal.addEventListener("abort", () => {
      reject(signal.reason);
    });
  });
}

export async function getMediaEntries(
  config: AppConfig,
  signal: AbortSignal
): Promise<MediaEntry[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      return reject(signal.reason);
    }

    fetch(
      listGoogleDriveFilesUrl(
        config.googleApiKey,
        config.driveFolderId,
        config.enabledMimeTypes,
        config.sharedDriveId
      ),
      { signal }
    ).then(async (response) => {
      const mediaResult = (await response.json()) as FilesListResponse;

      return resolve(
        mediaResult.files
          .sort((a, b) => {
            const x = a.name.toLowerCase();
            const y = b.name.toLowerCase();
            if (x < y) {
              return -1;
            }
            if (x > y) {
              return 1;
            }
            return 0;
          })
          .map((f) => ({
            mimeType: f.mimeType as MediaMimeType,
            url: f.mimeType.startsWith("video")
              ? getGoogleDriveFileWithApi(config.googleApiKey, f.id)
              : getGoogleDrivePublicImageUrl(f.id),
            name: f.name,
          }))
      );
    });

    signal.addEventListener("abort", () => {
      reject(signal.reason);
    });
  });
}
