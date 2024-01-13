export const GOOGLE_DRIVE_EXPANDED_FILE_FIELDS = ["mimeType", "id"] as const;

export type FilesListResponse = {
  kind: "drive#fileList";
  incompleteSearch: boolean;
  files: Record<(typeof GOOGLE_DRIVE_EXPANDED_FILE_FIELDS)[number], string>[];
};
