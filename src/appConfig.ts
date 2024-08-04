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

/**
 * Zod validation for all possible config values.
 * None should be optional here; this is controlled
 * in the actual validators used later.
 */
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
  ignoreVideoLength: z.boolean(),
});

/** Zod schema for validating the URL parameters. */
const urlParamSchema = allConfigSchema
  // All items are optional...
  .partial()
  // except the data required to establish a connection to Google Drive.
  .required({ googleApiKey: true, driveFolderId: true });

/** Zod schema for validating JSON files. */
const jsonParamSchema = allConfigSchema
  // If we're validating a JSON file, we've already connected to Google Drive.
  // Therefore, omit those.
  .omit({
    googleApiKey: true,
    driveFolderId: true,
    sharedDriveId: true,
    strictJsonParsing: true,
  })
  // All items should be optional.
  .partial();

/**
 * Zod schema defining what the default config object should look like.
 * The default config provides fallback values for any entries that are
 * not given in other configs, so all values (except those that we cannot
 * know in advance such as API key) are required.
 */
const defaultConfigSchema = allConfigSchema.omit({
  googleApiKey: true,
  driveFolderId: true,
  sharedDriveId: true,
});

/**
 * Zod schema for validating the final config, once all config sources have been merged.
 * Serves as a sanity check before rendering the UI.
 */
const appConfigSchema = allConfigSchema
  .omit({
    // strictJsonParsing only applies to the config loading step, not to the app.
    strictJsonParsing: true,
  })
  // sharedDriveId is truly optional.
  .partial({ sharedDriveId: true });

/** A type for an array of parameter names. */
type ParamNameArray = (keyof z.infer<typeof allConfigSchema>)[];

/** A type for the JSON file response. */
type JsonParams = z.infer<typeof jsonParamSchema>;

/** A type for the URL parameters. */
type UrlParams = z.infer<typeof urlParamSchema>;

/** A type for the default configuration object. */
type DefaultConfig = z.infer<typeof defaultConfigSchema>;

/** A type for the finalised app config as passed into the React UI. */
export type AppConfig = z.infer<typeof appConfigSchema>;

/** Parameters that must be specified in URL parameters */
const REQUIRED_PARAMS: ParamNameArray = ["googleApiKey", "driveFolderId"];

/** Parameters that are optional in URL parameters */
const OPTIONAL_PARAMS = (
  Object.keys(urlParamSchema.shape) as ParamNameArray
).filter((k) => !REQUIRED_PARAMS.includes(k));

/** Parameters that need to be converted to numbers when parsed from the URL query. */
const NUMERIC_PARAMS: ParamNameArray = [
  "fadeTime",
  "rotation",
  "slideLength",
  "refetchInterval",
];

/**
 * Parameters that need to be converted to boolean when parsed from the URL query.
 * "true" -> true, "false" -> false
 */
const BOOLEAN_PARAMS: ParamNameArray = [
  "enableRefetch",
  "strictJsonParsing",
  "ignoreVideoLength",
];

// Define types for the media entries that will be passed into the UI
type MediaMimeType = `${"video" | "image"}/${string}`;
type MediaEntry = {
  url: string;
  mimeType: MediaMimeType;
  name: string;
};
export type MediaEntryWithElement = MediaEntry & {
  element?: HTMLVideoElement | HTMLImageElement;
};

/** Default values that will be applied if not set via JSON or URL params */
const defaultConfig: DefaultConfig = {
  slideLength: 30,
  rotation: 0,
  enableRefetch: false,
  refetchInterval: 3,
  strictJsonParsing: false,
  fadeTime: 0.5,
  ignoreVideoLength: false,
  enabledMimeTypes: [
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "video/mp4",
    "video/webm",
  ],
};

/** Convert a string to a boolean, returning the original string if invalid */
function attemptToParseBoolean(input: string) {
  if (input === "true") return true;
  if (input === "false") return false;
  return input;
}

/** Convert a string to a number, returning the original string if invalid */
function attemptToParseNumber(input: string) {
  const output = Number(input);
  if (Number.isNaN(output)) {
    return input;
  }
  return output;
}

/** Retrieve and validate query parameters. */
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

/**
 * Get the app config, aborting if an abort signal is sent.
 * AbortSignal probably won't happen but it covers the case
 * where the component is unmounted.
 */
export async function getAppConfig(signal: AbortSignal): Promise<AppConfig> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
    }

    // Retrieve and validate query parameters
    const urlParamsConfig = getQueryParams();

    // Retrieve a list of JSON files in the given folder
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

      // For each JSON file in the folder, grab any config from inside it
      for (const file of jsonFiles.files) {
        let currentFileContent: JsonParams = {};

        try {
          // Fetch file content
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

        // Validate the file content
        const validationResult = jsonParamSchema.safeParse(currentFileContent);

        if (!validationResult.success) {
          if (urlParamsConfig.strictJsonParsing === true) {
            // If strict JSON parsing is enabled, throw an error
            throwParamValidationError(validationResult.error, {
              stage: "jsonParams",
              fileName: file.name,
            });
          } else {
            // Otherwise, log that it failed and try to apply any non-dodgy configuration parameters
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

        // Merge the config from the current JSON file with any previous JSON files
        jsonConfig = {
          ...jsonConfig,
          ...currentFileContent,
        };
      }

      // Merge all three config sources, prioritising JSON first, then URL params, then defaults.
      const mergedConfig: AppConfig = {
        ...defaultConfig,
        ...urlParamsConfig,
        ...jsonConfig,
      };

      // Validate the final params, throwing an error if invalid
      const validationResult = appConfigSchema.safeParse(mergedConfig);
      if (!validationResult.success)
        throwParamValidationError(validationResult.error, {
          stage: "finalCheck",
        });

      // Convert seconds to milliseconds for setTimeout()
      mergedConfig.slideLength *= 1000;

      // Convert minutes to milliseconds for setInterval()
      if (mergedConfig.refetchInterval)
        mergedConfig.refetchInterval *= 60 * 1000;

      console.debug(`Resolved app config, including defaults:`, mergedConfig);

      return resolve(mergedConfig);
    });

    // If the process is aborted (= the component is unmounted), reject the promise
    signal.addEventListener("abort", () => {
      reject(signal.reason);
    });
  });
}

/**
 * Retrieve media entry data from the Google Drive API, aborting if an abort signal is
 * sent. AbortSignal probably won't happen but it covers the case where the component
 * is unmounted.
 */
export async function getMediaEntries(
  config: AppConfig,
  signal: AbortSignal
): Promise<MediaEntry[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      return reject(signal.reason);
    }

    // Retrieve the list of files from Google Drive.
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
        // Map the API response to MediaEntry[].
        // The main job to do is get a host URL for the media item.
        mediaResult.files.map((f) => ({
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
