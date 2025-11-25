import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileIcon } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string, filePath: string) => void;
  disabled?: boolean;
}

export const FileUploadZone = ({
  onFilesSelected,
  uploadedFiles,
  onRemoveFile,
  disabled,
}: FileUploadZoneProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "glass border-border/50 border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragActive && "border-primary/50 bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary mb-1">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, PDF up to 10MB
            </p>
          </>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploaded Files</p>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="glass border-border/50 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(file.id, file.path)}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
