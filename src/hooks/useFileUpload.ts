import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return new File([compressedFile], file.name, { type: file.type });
    } catch (error) {
      console.error("Compression failed:", error);
      return file;
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid file type: ${file.name}`, {
        description: "Only PNG, JPG, and PDF files are allowed"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast.error(`File too large: ${file.name}`, {
        description: "Maximum file size is 10MB"
      });
      return false;
    }

    return true;
  };

  const uploadFiles = async (files: File[], requestId: string): Promise<UploadedFile[]> => {
    setUploading(true);
    const uploaded: UploadedFile[] = [];

    try {
      for (const file of files) {
        if (!validateFile(file)) {
          continue;
        }

        // Compress if image
        const processedFile = await compressImage(file);
        const fileExt = processedFile.name.split(".").pop();
        const fileName = `${requestId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError, data } = await supabase.storage
          .from("request-files")
          .upload(fileName, processedFile);

        if (uploadError) {
          toast.error(`Failed to upload: ${file.name}`);
          console.error(uploadError);
          continue;
        }

        // Save to database
        const { error: dbError, data: fileData } = await supabase
          .from("request_files")
          .insert({
            request_id: requestId,
            file_name: processedFile.name,
            file_path: data.path,
            file_size: processedFile.size,
            file_type: processedFile.type,
          })
          .select()
          .single();

        if (dbError) {
          toast.error(`Failed to save file record: ${file.name}`);
          console.error(dbError);
          continue;
        }

        uploaded.push({
          id: fileData.id,
          name: fileData.file_name,
          size: fileData.file_size,
          type: fileData.file_type,
          path: fileData.file_path,
        });
      }

      if (uploaded.length > 0) {
        toast.success(`Uploaded ${uploaded.length} file(s) successfully`);
        setUploadedFiles([...uploadedFiles, ...uploaded]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }

    return uploaded;
  };

  const removeFile = async (fileId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("request-files")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("request_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
      toast.success("File removed");
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Failed to remove file");
    }
  };

  return {
    uploading,
    uploadedFiles,
    uploadFiles,
    removeFile,
    setUploadedFiles,
  };
};
