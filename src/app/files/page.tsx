"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  CalendarArrowDown,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  ScanText,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import type {
  FileRecord,
  FileCategory,
  Room,
  WorkPackage,
  ParsedQuote,
} from "@/types";

// --------------- Constants ---------------

const FILE_CATEGORIES: { value: FileCategory; label: string }[] = [
  { value: "current_state", label: "Current State" },
  { value: "inspiration", label: "Inspiration" },
  { value: "quote", label: "Quote" },
  { value: "contract", label: "Contract" },
  { value: "receipt", label: "Receipt" },
  { value: "rendering", label: "Rendering" },
  { value: "spec_sheet", label: "Spec Sheet" },
  { value: "other", label: "Other" },
];

const ROOMS: { value: Room; label: string }[] = [
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

const CATEGORY_COLORS: Record<FileCategory, string> = {
  current_state: "bg-slate-500",
  inspiration: "bg-purple-500",
  quote: "bg-blue-500",
  contract: "bg-emerald-600",
  receipt: "bg-amber-500",
  rendering: "bg-pink-500",
  spec_sheet: "bg-cyan-500",
  other: "bg-gray-400",
};

type FileTypeFilter = "all" | "image" | "pdf" | "spreadsheet" | "other";
type SortField = "created_at" | "filename" | "category";
type SortDir = "asc" | "desc";

const ACCEPTED_FILE_TYPES =
  "image/*,.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,.rtf";

// --------------- Helpers ---------------

function getFileTypeGroup(mimeType: string): FileTypeFilter {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv" ||
    mimeType.includes("ms-excel")
  )
    return "spreadsheet";
  return "other";
}

function getFileIcon(fileType: string) {
  const group = getFileTypeGroup(fileType);
  switch (group) {
    case "image":
      return <FileImage className="h-4 w-4 text-blue-500" />;
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
}

function getCategoryLabel(category: FileCategory): string {
  const found = FILE_CATEGORIES.find((c) => c.value === category);
  return found?.label ?? category;
}

function getRoomLabel(room: Room | null): string {
  if (!room) return "\u2014";
  const found = ROOMS.find((r) => r.value === room);
  return found?.label ?? room;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --------------- Page Component ---------------

export default function FilesPage() {
  const supabase = useMemo(() => createClient(), []);

  // Data
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FileTypeFilter>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRoom, setFilterRoom] = useState<string>("all");
  const [filterWP, setFilterWP] = useState<string>("all");

  // Sort
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>("other");
  const [uploadRoom, setUploadRoom] = useState<string>("none");
  const [uploadWP, setUploadWP] = useState<string>("none");
  const [uploadTags, setUploadTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Parse quote
  const [parseDialogOpen, setParseDialogOpen] = useState(false);
  const [parsingFile, setParsingFile] = useState<FileRecord | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedQuote, setParsedQuote] = useState<ParsedQuote | null>(null);

  // --------------- Fetch data ---------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, wpRes] = await Promise.all([
        supabase
          .from("files")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("work_packages")
          .select("*")
          .order("number", { ascending: true }),
      ]);

      if (filesRes.data) setFiles(filesRes.data as FileRecord[]);
      if (wpRes.data) setWorkPackages(wpRes.data as WorkPackage[]);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --------------- WP lookup ---------------

  const wpMap = useMemo(() => {
    const m = new Map<string, WorkPackage>();
    workPackages.forEach((wp) => m.set(wp.id, wp));
    return m;
  }, [workPackages]);

  // --------------- Filtered & Sorted files ---------------

  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.filename.toLowerCase().includes(q));
    }

    // File type
    if (filterType !== "all") {
      result = result.filter((f) => getFileTypeGroup(f.file_type) === filterType);
    }

    // Category
    if (filterCategory !== "all") {
      result = result.filter((f) => f.category === filterCategory);
    }

    // Room
    if (filterRoom !== "all") {
      result = result.filter((f) => f.room === filterRoom);
    }

    // Work package
    if (filterWP !== "all") {
      result = result.filter((f) => f.work_package_id === filterWP);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "filename":
          cmp = a.filename.localeCompare(b.filename);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "created_at":
        default:
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [files, searchQuery, filterType, filterCategory, filterRoom, filterWP, sortField, sortDir]);

  // --------------- Upload handling ---------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setUploadFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      if (selected.length > 0) {
        setUploadFiles((prev) => [...prev, ...selected]);
      }
      // Reset so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  const removeUploadFile = useCallback((index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetUploadForm = useCallback(() => {
    setUploadFiles([]);
    setUploadCategory("other");
    setUploadRoom("none");
    setUploadWP("none");
    setUploadTags("");
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);

    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", uploadCategory);
        if (uploadRoom !== "none") formData.append("room", uploadRoom);
        if (uploadWP !== "none") formData.append("work_package_id", uploadWP);
        if (uploadTags.trim()) formData.append("tags", uploadTags.trim());

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || `Upload failed for ${file.name}`);
        }
      }

      setUploadOpen(false);
      resetUploadForm();
      await fetchData();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, uploadCategory, uploadRoom, uploadWP, uploadTags, fetchData, resetUploadForm]);

  // --------------- File actions ---------------

  const getFilePublicUrl = useCallback(
    (file: FileRecord): string => {
      const { data } = supabase.storage
        .from(file.file_type.startsWith("image/") ? "photos" : "documents")
        .getPublicUrl(file.storage_path);
      return data.publicUrl;
    },
    [supabase]
  );

  const handlePreview = useCallback(
    (file: FileRecord) => {
      const url = getFilePublicUrl(file);
      if (file.file_type.startsWith("image/")) {
        setLightboxUrl(url);
      } else {
        window.open(url, "_blank");
      }
    },
    [getFilePublicUrl]
  );

  const handleDownload = useCallback(
    (file: FileRecord) => {
      const url = getFilePublicUrl(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [getFilePublicUrl]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingFile) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/files?id=${deletingFile.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");

      setDeleteDialogOpen(false);
      setDeletingFile(null);
      await fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  }, [deletingFile, fetchData]);

  // --------------- Parse Quote ---------------

  const handleParseQuote = useCallback(
    async (file: FileRecord) => {
      setParsingFile(file);
      setParsedQuote(null);
      setParseDialogOpen(true);
      setParsing(true);

      try {
        const response = await fetch("/api/ai/parse-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: file.id }),
        });

        if (!response.ok) throw new Error("Parse failed");
        const data = await response.json();
        setParsedQuote(data.data as ParsedQuote);
      } catch (err) {
        console.error("Quote parse failed:", err);
      } finally {
        setParsing(false);
      }
    },
    []
  );

  // --------------- Sort toggle ---------------

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir(field === "filename" ? "asc" : "desc");
      }
    },
    [sortField]
  );

  // --------------- Render ---------------

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Files &amp; Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {files.length} file{files.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Button
          onClick={() => {
            resetUploadForm();
            setUploadOpen(true);
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as FileTypeFilter)}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {FILE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRoom} onValueChange={setFilterRoom}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Room" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {ROOMS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterWP} onValueChange={setFilterWP}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Work Package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Work Packages</SelectItem>
            {workPackages.map((wp) => (
              <SelectItem key={wp.id} value={wp.id}>
                WP{wp.number} &mdash; {wp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(searchQuery ||
          filterType !== "all" ||
          filterCategory !== "all" ||
          filterRoom !== "all" ||
          filterWP !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
              setFilterCategory("all");
              setFilterRoom("all");
              setFilterWP("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Files table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("filename")}
                      >
                        Filename
                        {sortField === "filename" ? (
                          <ArrowDownAZ className={cn("h-3.5 w-3.5", sortDir === "desc" && "rotate-180")} />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("category")}
                      >
                        Category
                        {sortField === "category" ? (
                          <ArrowDownAZ className={cn("h-3.5 w-3.5", sortDir === "desc" && "rotate-180")} />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Room</th>
                    <th className="px-4 py-3 text-left font-medium">Work Package</th>
                    <th className="px-4 py-3 text-left font-medium">Tags</th>
                    <th className="px-4 py-3 text-left font-medium">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("created_at")}
                      >
                        Uploaded
                        {sortField === "created_at" ? (
                          <CalendarArrowDown className={cn("h-3.5 w-3.5", sortDir === "asc" && "rotate-180")} />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        {files.length === 0
                          ? "No files uploaded yet. Click \"Upload Files\" to get started."
                          : "No files match the current filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => {
                      const wp = file.work_package_id
                        ? wpMap.get(file.work_package_id)
                        : null;
                      const isPdf = file.file_type === "application/pdf";
                      const isImage = file.file_type.startsWith("image/");

                      return (
                        <tr
                          key={file.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          {/* Filename */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.file_type)}
                              <span className="font-medium truncate max-w-[250px]">
                                {file.filename}
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <Badge
                              className={cn(
                                "text-[10px] text-white border-0",
                                CATEGORY_COLORS[file.category]
                              )}
                            >
                              {getCategoryLabel(file.category)}
                            </Badge>
                          </td>

                          {/* Room */}
                          <td className="px-4 py-3 text-muted-foreground">
                            {getRoomLabel(file.room)}
                          </td>

                          {/* Work Package */}
                          <td className="px-4 py-3">
                            {wp ? (
                              <Badge variant="outline" className="text-xs">
                                WP{wp.number}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>

                          {/* Tags */}
                          <td className="px-4 py-3">
                            {file.tags && file.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {file.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {file.tags.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{file.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>

                          {/* Upload date */}
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {formatDate(file.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {/* Preview */}
                              {(isImage || isPdf) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handlePreview(file)}
                                  title={isImage ? "View image" : "Open PDF"}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Download */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDownload(file)}
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>

                              {/* Parse Quote (PDFs in quote category) */}
                              {isPdf && file.category === "quote" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleParseQuote(file)}
                                  title="Parse Quote"
                                >
                                  <ScanText className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingFile(file);
                                  setDeleteDialogOpen(true);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result count */}
      {filteredFiles.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredFiles.length} of {files.length} file
          {files.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Drag and drop files or click to browse. Supports images, PDFs,
              spreadsheets, and documents.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Dropzone */}
            <div
              ref={dropzoneRef}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, PDFs, spreadsheets, documents
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Selected files list */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {uploadFiles.length} file{uploadFiles.length !== 1 ? "s" : ""}{" "}
                  selected
                </Label>
                <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
                  {uploadFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(file.type)}
                        <span className="text-xs truncate">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        className="flex-shrink-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadFile(idx);
                        }}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Metadata fields */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={uploadCategory}
                  onValueChange={(v) => setUploadCategory(v as FileCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Room</Label>
                  <Select value={uploadRoom} onValueChange={setUploadRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {ROOMS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Work Package</Label>
                  <Select value={uploadWP} onValueChange={setUploadWP}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select WP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {workPackages.map((wp) => (
                        <SelectItem key={wp.id} value={wp.id}>
                          WP{wp.number} &mdash; {wp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="upload-tags">Tags (comma-separated)</Label>
                <Input
                  id="upload-tags"
                  placeholder="e.g. countertop, granite, sample"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadFiles.length === 0}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingFile?.filename}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog
        open={!!lightboxUrl}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Full-size image preview</DialogDescription>
          </DialogHeader>
          {lightboxUrl && (
            <div className="flex items-center justify-center max-h-[85vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Parse Quote Dialog */}
      <Dialog open={parseDialogOpen} onOpenChange={setParseDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parsed Quote</DialogTitle>
            <DialogDescription>
              AI-extracted data from &ldquo;{parsingFile?.filename}&rdquo;
            </DialogDescription>
          </DialogHeader>

          {parsing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing PDF and extracting quote data...
              </p>
            </div>
          ) : parsedQuote ? (
            <div className="space-y-4 py-2">
              {/* Contractor info */}
              <div className="grid grid-cols-2 gap-3">
                {parsedQuote.contractor_name && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Contractor
                    </p>
                    <p className="text-sm font-medium">
                      {parsedQuote.contractor_name}
                    </p>
                  </div>
                )}
                {parsedQuote.company && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Company
                    </p>
                    <p className="text-sm">{parsedQuote.company}</p>
                  </div>
                )}
                {parsedQuote.trade && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Trade
                    </p>
                    <p className="text-sm">{parsedQuote.trade}</p>
                  </div>
                )}
                {parsedQuote.valid_until && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Valid Until
                    </p>
                    <p className="text-sm">
                      {formatDate(parsedQuote.valid_until)}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Line items */}
              {parsedQuote.line_items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Line Items
                  </p>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-3 py-1.5 text-left text-xs font-medium">
                            Description
                          </th>
                          <th className="px-3 py-1.5 text-right text-xs font-medium">
                            Qty
                          </th>
                          <th className="px-3 py-1.5 text-right text-xs font-medium">
                            Unit Price
                          </th>
                          <th className="px-3 py-1.5 text-right text-xs font-medium">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedQuote.line_items.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="px-3 py-1.5 text-xs">
                              {item.description}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right">
                              {item.quantity ?? "\u2014"}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right">
                              {item.unit_price != null
                                ? `$${item.unit_price.toFixed(2)}`
                                : "\u2014"}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right font-medium">
                              ${item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              {parsedQuote.total_amount != null && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <span className="text-sm font-medium">Total Amount</span>
                  <span className="text-lg font-bold">
                    ${parsedQuote.total_amount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Notes */}
              {parsedQuote.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {parsedQuote.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm text-muted-foreground">
                Failed to parse the quote. The PDF may not contain recognizable
                quote data.
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
