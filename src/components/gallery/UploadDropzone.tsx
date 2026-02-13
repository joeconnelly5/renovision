"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/format";
import type { FileCategory, Room } from "@/types";

const ROOM_OPTIONS: { value: Room; label: string }[] = [
  { value: "kitchen", label: "Kitchen" },
  { value: "living_dining", label: "Living / Dining" },
  { value: "bedroom_1", label: "Bedroom 1" },
  { value: "bedroom_2", label: "Bedroom 2" },
  { value: "bedroom_3", label: "Bedroom 3" },
  { value: "upper_hall", label: "Upper Hall" },
  { value: "front_entry", label: "Front Entry" },
  { value: "rear_entry", label: "Rear Entry" },
  { value: "staircase", label: "Staircase" },
  { value: "mudroom", label: "Mudroom" },
  { value: "general", label: "General" },
];

const CATEGORY_OPTIONS: { value: FileCategory; label: string }[] = [
  { value: "current_state", label: "Current State" },
  { value: "inspiration", label: "Inspiration" },
];

interface PendingFile {
  file: File;
  preview: string;
  category: FileCategory;
  room: Room;
  uploadProgress: number;
  uploadStatus: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

interface UploadDropzoneProps {
  onUploadComplete: () => void;
}

export default function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: PendingFile[] = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      category: "current_state" as FileCategory,
      room: "general" as Room,
      uploadProgress: 0,
      uploadStatus: "pending" as const,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/heic": [".heic"],
      "image/webp": [".webp"],
    },
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateFileCategory = (index: number, category: FileCategory) => {
    setPendingFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], category };
      return updated;
    });
  };

  const updateFileRoom = (index: number, room: Room) => {
    setPendingFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], room };
      return updated;
    });
  };

  const uploadAllFiles = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);

    const results = await Promise.allSettled(
      pendingFiles.map(async (pf, index) => {
        setPendingFiles((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], uploadStatus: "uploading", uploadProgress: 10 };
          return updated;
        });

        const formData = new FormData();
        formData.append("file", pf.file);
        formData.append("category", pf.category);
        formData.append("room", pf.room);

        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setPendingFiles((prev) => {
                const updated = [...prev];
                if (updated[index]) {
                  updated[index] = { ...updated[index], uploadProgress: percent };
                }
                return updated;
              });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setPendingFiles((prev) => {
                const updated = [...prev];
                if (updated[index]) {
                  updated[index] = {
                    ...updated[index],
                    uploadStatus: "done",
                    uploadProgress: 100,
                  };
                }
                return updated;
              });
              resolve();
            } else {
              setPendingFiles((prev) => {
                const updated = [...prev];
                if (updated[index]) {
                  updated[index] = {
                    ...updated[index],
                    uploadStatus: "error",
                    errorMessage: `Upload failed (${xhr.status})`,
                  };
                }
                return updated;
              });
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            setPendingFiles((prev) => {
              const updated = [...prev];
              if (updated[index]) {
                updated[index] = {
                  ...updated[index],
                  uploadStatus: "error",
                  errorMessage: "Network error",
                };
              }
              return updated;
            });
            reject(new Error("Network error"));
          });

          xhr.open("POST", "/api/files/upload");
          xhr.send(formData);
        });

        return uploadPromise;
      })
    );

    setIsUploading(false);

    const allSucceeded = results.every((r) => r.status === "fulfilled");
    if (allSucceeded) {
      pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview));
      setPendingFiles([]);
      onUploadComplete();
    } else {
      onUploadComplete();
    }
  };

  const pendingCount = pendingFiles.filter((f) => f.uploadStatus === "pending").length;
  const doneCount = pendingFiles.filter((f) => f.uploadStatus === "done").length;
  const errorCount = pendingFiles.filter((f) => f.uploadStatus === "error").length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop photos here...</p>
        ) : (
          <>
            <p className="text-sm font-medium">Drag and drop photos here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, HEIC, or WebP accepted
            </p>
          </>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {pendingFiles.length} photo{pendingFiles.length !== 1 ? "s" : ""} selected
              {doneCount > 0 && (
                <span className="ml-2 text-green-600">({doneCount} uploaded)</span>
              )}
              {errorCount > 0 && (
                <span className="ml-2 text-destructive">({errorCount} failed)</span>
              )}
            </p>
            {!isUploading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview));
                  setPendingFiles([]);
                }}
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
            {pendingFiles.map((pf, index) => (
              <div
                key={`${pf.file.name}-${index}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  pf.uploadStatus === "done" && "border-green-200 bg-green-50",
                  pf.uploadStatus === "error" && "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {pf.file.type === "image/heic" ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={pf.preview}
                      alt={pf.file.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {pf.file.name}
                    </p>
                    {!isUploading && pf.uploadStatus === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {pf.uploadStatus === "pending" && (
                    <div className="flex gap-2">
                      <Select
                        value={pf.category}
                        onValueChange={(val) =>
                          updateFileCategory(index, val as FileCategory)
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={pf.room}
                        onValueChange={(val) =>
                          updateFileRoom(index, val as Room)
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(pf.uploadStatus === "uploading" || pf.uploadStatus === "done") && (
                    <Progress value={pf.uploadProgress} className="h-1.5" />
                  )}

                  {pf.uploadStatus === "done" && (
                    <Badge variant="secondary" className="text-xs text-green-700">
                      Uploaded
                    </Badge>
                  )}

                  {pf.uploadStatus === "error" && (
                    <p className="text-xs text-destructive">{pf.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={uploadAllFiles}
            disabled={isUploading || pendingCount === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount} Photo{pendingCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
