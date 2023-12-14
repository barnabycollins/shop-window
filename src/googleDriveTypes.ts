export type FilesListResponse = {
  kind: "drive#fileList";
  incompleteSearch: boolean;
  files: {
    kind: "drive#file";
    mimeType: string;
    id: string;
    name: string;
  }[];
};
