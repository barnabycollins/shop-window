const GOOGLE_DRIVE_EXPANDED_FILE_FIELDS = ["mimeType", "id", "name"] as const;

export type FilesListResponse = {
  files: Record<(typeof GOOGLE_DRIVE_EXPANDED_FILE_FIELDS)[number], string>[];
};

export function getGoogleDrivePublicImageUrl(fileId: string) {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function listGoogleDriveFilesUrl(
  googleApiKey: string,
  driveFolderId: string,
  sharedDriveId?: string
) {
  return (
    `https://www.googleapis.com/drive/v3/files?` +
    new URLSearchParams({
      key: googleApiKey,
      q: `'${driveFolderId}' in parents and trashed = false`,
      fields: `files(${GOOGLE_DRIVE_EXPANDED_FILE_FIELDS.join(",")})`,
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      ...(sharedDriveId
        ? {
            driveId: sharedDriveId,
            corpora: "drive",
          }
        : {}),
    })
  );
}

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
