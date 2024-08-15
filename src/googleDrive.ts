/** Which fields to expand when querying for files */
const GOOGLE_DRIVE_EXPANDED_FILE_FIELDS = ["mimeType", "id", "name"] as const;

/** The type of the response from the Google Drive files.list API. */
export type FilesListResponse = {
  files: Record<(typeof GOOGLE_DRIVE_EXPANDED_FILE_FIELDS)[number], string>[];
};

/**
 * Generate a URL for a query to list files for the given Drive folder and mime types.
 */
export function listGoogleDriveFilesUrl(
  googleApiKey: string,
  driveFolderId: string,
  mimeTypes: string[],
  sharedDriveId?: string
) {
  return (
    `https://www.googleapis.com/drive/v3/files?` +
    new URLSearchParams({
      // API key is required to authenticate the request
      key: googleApiKey,
      // Non-trashed files in the relevant folder with the correct mime type(s)
      q: `'${driveFolderId}' in parents and trashed = false and (${mimeTypes.map((type) => `mimeType = '${type}'`).join(" or ")})`,
      // Select which attributes to retrieve
      fields: `files(${GOOGLE_DRIVE_EXPANDED_FILE_FIELDS.join(",")})`,
      // Sort by file name ascending
      orderBy: "name",
      // Both required to enable access to shared drives
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      ...(sharedDriveId
        ? {
            // If items are in a shared drive, the shared drive ID must be provided
            driveId: sharedDriveId,
            corpora: "drive",
          }
        : {}),
    })
  );
}

/**
 * This host doesn't require an API key, so has no rate limit, but will only
 * serve images. For videos, it will return a thumbnail only.
 */
export function getGoogleDrivePublicImageUrl(fileId: string) {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Retrieve file content using the Google Drive API. This API needs authentication
 * with an API key, and will get you rate limited if you aren't careful when testing.
 */
export function getGoogleDriveFileWithApi(
  googleApiKey: string,
  fileId: string
) {
  return (
    `https://www.googleapis.com/drive/v3/files/${fileId}?` +
    new URLSearchParams({
      key: googleApiKey,
      alt: "media",
      supportsAllDrives: "true",
    })
  );
}
