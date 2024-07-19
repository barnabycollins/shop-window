export const GOOGLE_DRIVE_EXPANDED_FILE_FIELDS = ["mimeType", "id"] as const;

export type FilesListResponse = {
  files: Record<(typeof GOOGLE_DRIVE_EXPANDED_FILE_FIELDS)[number], string>[];
};

export function getGoogleDriveDownloadUrl(fileId: string) {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}
