"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { EditRecipe, ExportResult, ExportStatus, MAX_FILE_SIZE } from "@/lib/types";
import { DEFAULT_RECIPE } from "@/lib/constants";
import { loadFFmpeg, exportVideo, terminateFFmpeg, FFmpegLoadError } from "@/lib/ffmpeg";

const DEFAULT_TITLE = "Reframe — Resize, trim, and export videos in your browser";
const LOCAL_STORAGE_KEY = 'reframe-projects-v1';
const STORAGE_KEY = 'reframe-current-recipe-v1';

export interface VideoProject {
  id: string;
  name: string;
  updatedAt: string;
  version: string;
  settings: {
    recipe: EditRecipe;
    duration: number;
  };
}

export function extractMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject( new Error("Video metaData load timeout"))
    }, 500);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: isFinite(video.duration) ? video.duration : 0,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };
    video.src = url;
  });
}

function verifyMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve(false);
        return;
      }
      const arr = new Uint8Array(e.target.result as ArrayBuffer);
      const hex = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const ascii = String.fromCharCode(...arr);

      if (hex.startsWith("1A45DFA3")) resolve(true);
      else if (hex.startsWith("52494646")) resolve(true);
      else if (ascii.substring(0, 12).includes("ftyp")) resolve(true);
      else resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

function isValidRecipe(obj: any): obj is EditRecipe {
  return obj && typeof obj === "object" && "preset" in obj && "format" in obj;
}

export function useVideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [recipe, setRecipe] = useState<EditRecipe>(DEFAULT_RECIPE);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const exportAbortControllerRef = useRef<AbortController | null>(null);
  const exportCancelledRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(70);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(40);
  const [loopMusic, setLoopMusic] = useState(false);

  const [overlayFile, setOverlayFile] = useState<File | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<"bottom-right" | "top-right" | "top-left" | "bottom-left">("bottom-right");
  const [overlaySize, setOverlaySize] = useState(150);
  const [overlayOpacity, setOverlayOpacity] = useState(100);

  const [currentTime, setCurrentTime] = useState(0);
  const [soundOnCompletion, setSoundOnCompletion] = useState(true);

  const updateRecipe = useCallback((patch: Partial<EditRecipe>) => {
    setRecipe((prev) => {
      const next = { ...prev, ...patch };
      if (next.format === "gif") {
        next.keepAudio = false;
      }
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOnCompletion((prev) => !prev);
  }, []);

  const isValidValue = (key: keyof EditRecipe, val: any): boolean => {
    switch (key) {
      case "preset": return typeof val === "string";
      case "customWidth": return typeof val === "number" && !isNaN(val) && val >= 16 && val <= 7680;
      case "customHeight": return typeof val === "number" && !isNaN(val) && val >= 16 && val <= 7680;
      case "framing": return val === "fit" || val === "fill";
      case "trimStart": return typeof val === "number" && !isNaN(val) && val >= 0;
      case "trimEnd": return val === null || (typeof val === "number" && !isNaN(val) && val >= 0);
      case "rotate": return val === 0 || val === 90 || val === 180 || val === 270;
      case "speed": return typeof val === "number" && !isNaN(val) && [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4].includes(val);
      case "quality": return typeof val === "number" && !isNaN(val) && val >= 18 && val <= 30;
      case "format": return val === "mp4" || val === "webm" || val === "mkv" || val === "gif";
      case "brightness": return typeof val === "number" && !isNaN(val) && val >= -1 && val <= 1;
      case "contrast": return typeof val === "number" && !isNaN(val) && val >= 0 && val <= 2;
      case "saturation": return typeof val === "number" && !isNaN(val) && val >= 0 && val <= 3;
      default: return true;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const recipeKeys = Object.keys(DEFAULT_RECIPE) as Array<keyof EditRecipe>;
      const hasRecipeParams = recipeKeys.some(key => params.has(key));

      if (hasRecipeParams) {
        const updatedPatch: Partial<EditRecipe> = {};
        recipeKeys.forEach((key) => {
          const paramVal = params.get(key);
          if (paramVal !== null) {
            const defaultType = typeof DEFAULT_RECIPE[key];
            let parsedVal: any;

            if (defaultType === "number") {
              parsedVal = parseFloat(paramVal);
            } else if (defaultType === "boolean") {
              parsedVal = paramVal === "true";
            } else {
              parsedVal = paramVal === "null" ? null : paramVal;
            }

            if (isValidValue(key, parsedVal)) {
              (updatedPatch as any)[key] = parsedVal;
            }
          }
        });

        if (Object.keys(updatedPatch).length > 0) {
          setRecipe(prev => ({ ...prev, ...updatedPatch }));
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isValidRecipe(parsed)) {
              setRecipe(parsed);
              return;
            }
          }
        } catch {}

        const saved = localStorage.getItem("reframe-settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setRecipe(prev => ({
            ...prev,
            preset: parsed.preset ?? prev.preset,
            quality: parsed.quality ?? prev.quality,
            speed: parsed.speed ?? prev.speed,
            customWidth: parsed.customWidth ?? prev.customWidth,
            customHeight: parsed.customHeight ?? prev.customHeight
          }));
        }
      }
    } catch (e) {}
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setResult(null);
    setStatus("idle");
    setError(null);
    setFile(null);
    if (!selectedFile.type.startsWith("video/")) {
      setFileError("Please upload a video file only.");
      return;
    }

    setFileError("");

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Validation Failed: File too large. Maximum size is 2GB.`);
      setStatus("error");
      return;
    }

    const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const filename = selectedFile.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => filename.endsWith(ext));
    if (!hasValidExtension) {
      setError(`Layer 1 Validation Failed: Invalid file extension. Expected one of: ${validExtensions.join(', ')}`);
      setStatus("error");
      return;
    }

    if (!selectedFile.type.startsWith("video/")) {
      setError(`Layer 2 Validation Failed: Invalid MIME type. Expected video/*, got ${selectedFile.type || 'unknown'}`);
      setStatus("error");
      return;
    }

    const isVideo = await verifyMagicBytes(selectedFile);
    if (!isVideo) {
      setError("Layer 3 Validation Failed: Invalid file content. The file's magic bytes do not match known video formats.");
      setStatus("error");
      return;
    }

    try {
      const { duration: dur } = await extractMetadata(selectedFile);
      setDuration(dur);
      setFile(selectedFile);
      setRecipe((prev) => ({ ...prev, trimStart: 0, trimEnd: null }));
    } catch (err) {
      setError(`Layer 4 Validation Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStatus("error");
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!file) return;
    if (status === "loading-engine" || status === "exporting") return;

    const abortController = new AbortController();
    exportAbortControllerRef.current = abortController;
    exportCancelledRef.current = false;

    try {
      setStatus("loading-engine");
      setProgress(0);
      setError(null);
      if (result?.blobUrl) URL.revokeObjectURL(result.blobUrl);
      setResult(null);

      const ffmpeg = await loadFFmpeg(abortController.signal);
      if (exportCancelledRef.current) return;

      setStatus("exporting");

      const exportResult = await exportVideo(
        ffmpeg,
        file,
        recipe,
        setProgress,
        abortController.signal
      );
      if (exportCancelledRef.current) return;

      setResult(exportResult);
      setStatus("done");
    }  catch (err) {
      if (exportCancelledRef.current) return;

      console.error("export failed:", err);
      if (err instanceof FFmpegLoadError) {
        setError(err.message);
      } else if (err instanceof Error && err.message.includes('network')) {
        setError('Network error. Check your internet connection and try again.');
      } else if (err instanceof Error && err.message.includes('codec')) {
        setError('This video format is not supported. Try converting to MP4 first.');
      } else {
        setError('Export failed. Please try again or use a different video.');
      }
      setStatus("error");
    }
    finally {
      if (exportAbortControllerRef.current === abortController) {
        exportAbortControllerRef.current = null;
      }
    }
  }, [file, recipe, result, status]);

  useEffect(() => {
    if (file) {
      document.title = `Editing: ${file.name} | Reframe`;
    } else {
      document.title = DEFAULT_TITLE;
    }
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [file]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "Enter" &&
        file &&
        status !== "loading-engine" &&
        status !== "exporting"
      ) {
        handleExport();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [file, status, handleExport]);

  useEffect(()=>{
    return ()=>{
      if(result?.blobUrl){
        URL.revokeObjectURL(result.blobUrl);
      }
    };
  },[result?.blobUrl]);

  const resetSettings = useCallback(() => {
    setRecipe(DEFAULT_RECIPE);
  }, []);

  const cancelExport = useCallback(() => {
    exportCancelledRef.current = true;
    exportAbortControllerRef.current?.abort();
    exportAbortControllerRef.current = null;
    terminateFFmpeg();
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    if (result?.blobUrl) URL.revokeObjectURL(result.blobUrl);
    setFile(null);
    setDuration(0);
    setRecipe(DEFAULT_RECIPE);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  }, [result]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (status !== "exporting") return;

    const interval = setInterval(() => {
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      if (mem) {
        console.log("[Reframe Memory]", Math.round(mem.usedJSHeapSize / 1e6), "MB used");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  });

  const getAllProjects = useCallback((): Record<string, VideoProject> => {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (err) {
      console.error("Failed to parse projects from localStorage", err);
      return {};
    }
  }, []);

  const saveProject = useCallback((name: string) => {
    try {
      const projects = getAllProjects();
      const id = Date.now().toString();
      
      const newProject: VideoProject = {
        id,
        name,
        updatedAt: new Date().toISOString(),
        version: "v1",
        settings: {
          recipe,
          duration,
        },
      };

      projects[id] = newProject;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (err) {
      console.error("Failed to save project", err);
      return false;
    }
  }, [recipe, duration, getAllProjects]);

  const listProjects = useCallback((): VideoProject[] => {
    const projects = getAllProjects();
    return Object.values(projects).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [getAllProjects]);

  const loadProject = useCallback((id: string) => {
    const projects = getAllProjects();
    const project = projects[id];
    if (!project) return false;

    setRecipe(project.settings.recipe);
    setDuration(project.settings.duration);
    return true;
  }, [getAllProjects]);

  const deleteProject = useCallback((id: string) => {
    try {
      const projects = getAllProjects();
      if (projects[id]) {
        delete projects[id];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete project", err);
      return false;
    }
  }, [getAllProjects]);

  return {
    file,
    duration,
    recipe,
    status,
    progress,
    result,
    error,
    videoRef,
    seekTo,
    updateRecipe,
    handleFileSelect,
    fileError,
    handleExport,
    cancelExport,
    reset,
    resetSettings,
    saveProject,
    listProjects,
    loadProject,
    deleteProject,
    musicFile,
    setMusicFile,
    musicVolume,
    setMusicVolume,
    originalAudioVolume,
    setOriginalAudioVolume,
    loopMusic,
    setLoopMusic,
    overlayFile,
    setOverlayFile,
    overlayPosition,
    setOverlayPosition,
    overlaySize,
    setOverlaySize,
    overlayOpacity,
    setOverlayOpacity,
    currentTime,
    soundOnCompletion,
    toggleSound,
    recommendedPreset: null
  };

}