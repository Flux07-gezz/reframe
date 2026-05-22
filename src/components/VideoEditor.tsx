"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import FileUpload from "./FileUpload";
import VideoPreview from "./VideoPreview";
import ThumbnailStrip from "./ThumbnailStrip";
import PresetSelector from "./PresetSelector";
import FramingControl from "./FramingControl";
import TrimControl from "./TrimControl";
import RotateControl from "./RotateControl";
import AudioSpeedControl from "./AudioSpeedControl";
import FormatSelector from "./FormatSelector";
import ExportSettings from "./ExportSettings";
import ExportOverlay from "./ExportOverlay";
import DownloadResult from "./DownloadResult";
import { cn } from "@/lib/utils";
import {
  Layers, Crop, Scissors, RotateCw, Volume2,
  SlidersHorizontal, Zap, AlertTriangle, Save, FolderOpen, Trash2, X
} from "lucide-react";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ icon, title, children, delay = 0 }: SectionProps) {
  return (
    <div
      className="space-y-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-film-500 opacity-80">{icon}</span>
        <h3 className="text-sm font-heading font-bold uppercase tracking-widest text-[var(--muted)]">
          {title}
        </h3>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      {children}
    </div>
  );
}

export default function VideoEditor() {
  const {
    file, duration, recipe, status, progress,
    result, error, updateRecipe,
    handleFileSelect, fileError, handleExport, cancelExport, reset, resetSettings,
    videoRef,
    seekTo,
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
    currentTime,
    recommendedPreset,
  } = useVideoEditor();

  const [copied, setCopied] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  const [activeModal, setActiveModal] = useState<"save" | "load" | null>(null);
  const [projectName, setProjectName] = useState("");
  const [savedProjects, setSavedProjects] = useState<ReturnType<typeof listProjects>>([]);

  const [soundOnCompletion, setSoundOnCompletion] = useState(true);
  const handleToggleSound = () => setSoundOnCompletion((prev) => !prev);

  useEffect(() => {
    if (status === "done" && downloadRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      downloadRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? "instant" : "smooth",
        block: "center",
      });
    }
  }, [status]);

  useEffect(() => {
    if (activeModal === "load") {
      setSavedProjects(listProjects());
    }
  }, [activeModal, listProjects]);

  const isProcessing = status === "loading-engine" || status === "exporting";

  const videoSrc = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const success = saveProject(projectName.trim());
    if (success) {
      setProjectName("");
      setActiveModal(null);
    }
  };

  const handleLoadSelect = (id: string) => {
    const success = loadProject(id);
    if (success) {
      setActiveModal(null);
    }
  };

  const handleDeleteSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = deleteProject(id);
    if (success) {
      setSavedProjects(listProjects());
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: "var(--bg)" }}>
      <ExportOverlay status={status} progress={progress} onCancel={cancelExport} />

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {status === "exporting" && `Exporting video: ${progress}%`}
        {status === "done" && "Export complete! Video ready to download."}
        {status === "error" && `Export failed: ${error}`}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-6 flex-1 w-full">

        <header className="mb-6 flex items-end justify-between animate-fade-in">
          <div>
            <h1 className="font-display text-6xl leading-none tracking-widest2 text-[var(--text)]">
              REFRAME
            </h1>
            <p className="font-heading text-sm text-[var(--muted)] mt-1 uppercase tracking-widest">
              Your video, any format
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm font-heading font-semibold uppercase tracking-widest text-[var(--muted)] pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
            No login. No ads. 100% private - your video never leaves your device.
          </div>
        </header>

        <div className="mb-6 flex gap-3 justify-end animate-fade-in" style={{ animationDelay: "25ms" }}>
          <button
            type="button"
            onClick={() => setActiveModal("save")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-heading text-xs font-bold uppercase tracking-widest text-[var(--text)] hover:opacity-80 transition-all cursor-pointer"
          >
            <Save size={14} className="text-film-500" />
            Save Project
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("load")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-heading text-xs font-bold uppercase tracking-widest text-[var(--text)] hover:opacity-80 transition-all cursor-pointer"
          >
            <FolderOpen size={14} className="text-film-500" />
            Load Project
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

          <div className="space-y-4">
            <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] animate-fade-in">
              <FileUpload onFileSelect={handleFileSelect} currentFile={file} fileError={fileError} duration={duration} />

              {!file && (
                <div className="text-center text-[var(--muted)] py-6">
                  <p>Upload a video to get started</p>
                  <p className="text-sm">Supports MP4, MOV, WebM and more</p>
                </div>
              )}

              {file && (
                <div className="mt-4 animate-fade-in">
                  <VideoPreview file={file} videoRef={videoRef} />

                  <div className="mt-3">
                    <ThumbnailStrip
                      videoSrc={videoSrc}
                      duration={duration}
                      currentTime={videoRef.current?.currentTime ?? 0}
                      trimStart={recipe.trimStart ?? 0}
                      trimEnd={recipe.trimEnd ?? duration}
                      onSeek={seekTo}
                    />
                  </div>
                </div>
              )}
            </div>

            {file && file.size > 100 * 1024 * 1024 && (
              <p className="text-[var(--warning)] text-sm">
                ⚠️ Large file - processing may take several minutes
              </p>
            )}      
            {file && (
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4",
                isProcessing && "pointer-events-none opacity-50"
              )}>
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-6">
                  <Section icon={<Scissors size={12} />} title="Trim" delay={50}>
                    <TrimControl recipe={recipe} onChange={updateRecipe} duration={duration} file={file} />
                  </Section>
                  <Section icon={<RotateCw size={12} />} title="Rotate" delay={100}>
                    <RotateControl recipe={recipe} onChange={updateRecipe} />
                  </Section>
                </div>
                
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-6">
                  <Section icon={<Volume2 size={12} />} title="Audio & Speed" delay={150}>
                    <AudioSpeedControl recipe={recipe} onChange={updateRecipe} />
                  </Section>

                  <Section icon={<SlidersHorizontal size={12} />} title="Adjustments" delay={175}>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <label htmlFor="brightness-slider">Brightness</label>
                          <button
                            type="button"
                            onClick={() => updateRecipe({ brightness: 0 })}
                            className="text-film-500 hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                        <input
                          id="brightness-slider"
                          type="range"
                          min="-1"
                          max="1"
                          step="0.1"
                          value={recipe.brightness}
                          onChange={(e) => updateRecipe({ brightness: Number(e.target.value) })}
                          aria-label="Adjust brightness"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <label htmlFor="contrast-slider">Contrast</label>
                          <button
                            type="button"
                            onClick={() => updateRecipe({ contrast: 1 })}
                            className="text-film-500 hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                        <input
                          id="contrast-slider"
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={recipe.contrast}
                          onChange={(e) => updateRecipe({ contrast: Number(e.target.value) })}
                          aria-label="Adjust contrast"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <label htmlFor="saturation-slider">Saturation</label>
                          <button
                            type="button"
                            onClick={() => updateRecipe({ saturation: 1 })}
                            className="text-film-500 hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                        <input
                          id="saturation-slider"
                          type="range"
                          min="0"
                          max="3"
                          step="0.1"
                          value={recipe.saturation}
                          onChange={(e) => updateRecipe({ saturation: Number(e.target.value) })}
                          aria-label="Adjust saturation"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </Section>

                  <Section icon={<SlidersHorizontal size={12} />} title="Output format" delay={190}>
                    <FormatSelector recipe={recipe} onChange={updateRecipe} />
                  </Section>
                  <Section icon={<SlidersHorizontal size={12} />} title="Export quality" delay={200}>
                    <ExportSettings recipe={recipe} onChange={updateRecipe} duration={duration} />
                  </Section>
                </div>
              </div>
            )}

            {status === "error" && error && (
              <div
                role="status"
                className="flex items-start gap-3 p-4 bg-film-50 border border-film-200 rounded-xl text-film-800 text-sm animate-fade-in"
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-film-500" />
                <div className="flex-1">
                  <p className="font-heading font-bold text-sm">Error</p>
                  <p className="text-film-600 text-sm mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(error).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="px-3 py-1.5 bg-[var(--border)] border border-[var(--border)] rounded-lg text-sm font-semibold hover:opacity-80 transition-colors shrink-0 whitespace-nowrap"
                  aria-label="Copy error message to clipboard"
                >
                  {copied ? "Copied!" : "Copy error"}
                </button>
                {!error.includes("Validation Failed") && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg text-sm font-semibold hover:bg-[var(--error-hover)] hover:border-[var(--error)] text-[var(--text)] transition-colors shrink-0 whitespace-nowrap"
                  >
                    Retry Export
                  </button>
                )}
              </div>
            )}

            {status === "done" && result && (
              <div role="status" className="animate-fade-in" ref={downloadRef}>
                <DownloadResult 
                  result={result} 
                  onReset={reset} 
                  soundOnCompletion={soundOnCompletion} 
                  onToggleSound={handleToggleSound} 
                />
              </div>
            )}
          </div>

          <div className={cn(
            "space-y-5",
            isProcessing && "pointer-events-none opacity-50"
          )}>
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-6 animate-fade-in" style={{ animationDelay: "50ms" }}>
              <Section icon={<Layers size={12} />} title="Output size">
                <PresetSelector recipe={recipe} onChange={updateRecipe} />
              </Section>

              <Section icon={<Crop size={12} />} title="Framing" delay={100}>
                <FramingControl recipe={recipe} onChange={updateRecipe} />
              </Section>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={resetSettings}
                  className="text-sm font-heading font-bold uppercase tracking-widest text-[var(--muted)] hover:text-film-600 transition-all opacity-60 hover:opacity-100"
                >
                  Reset all settings
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={!file || isProcessing}
              aria-label='Export video'
              aria-disabled={!file || isProcessing ? "true" : undefined}
              className={cn(
                "w-full flex items-center justify-center gap-3 py-5 rounded-xl",
                "font-display text-2xl tracking-widest transition-all duration-200",
                file && !isProcessing
                  ? "bg-film-600 hover:bg-film-700 hover:scale-[1.01] text-white shadow-lg shadow-film-200 active:scale-[0.98] cursor-pointer"
                  : "bg-[var(--border)] text-[var(--muted)] opacity-40 cursor-not-allowed"
              )}
            >
              <Zap size={20} className={cn(file && !isProcessing && "animate-pulse")} />
              {isProcessing ? "PROCESSING" : "EXPORT"}
            </button>
          </div>
        </div>
      </div>

      {activeModal === "save" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              aria-label="Close save modal"
            >
              <X size={18} />
            </button>
            <div>
              <h2 className="font-heading font-bold uppercase tracking-widest text-[var(--text)] flex items-center gap-2">
                <Save size={16} className="text-film-500" /> Save Current Project
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Your configurations, trim zones, and color adjustments are written locally.
              </p>
            </div>
            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="modal-project-name" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Project Title
                </label>
                <input
                  id="modal-project-name"
                  type="text"
                  required
                  placeholder="e.g., Cinematic Reel Edit"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-film-500 transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold text-[var(--muted)] hover:bg-[var(--border)]/30 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-film-600 hover:bg-film-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-film-100 cursor-pointer"
                >
                  Confirm Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "load" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh] space-y-4">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              aria-label="Close load modal"
            >
              <X size={18} />
            </button>
            <div>
              <h2 className="font-heading font-bold uppercase tracking-widest text-[var(--text)] flex items-center gap-2">
                <FolderOpen size={16} className="text-film-500" /> Restore Saved Project
              </h2>
              <div className="mt-2 text-xs text-[var(--warning)] bg-[var(--warning-bg)]/20 border border border-[var(--warning)]/30 p-2 rounded-lg flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>
                  <strong>Important:</strong> Media blobs cannot be stringified into storage. Once loaded, you will simply select your target video input file to proceed with processing.
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[200px]">
              {savedProjects.length === 0 ? (
                <div className="text-center text-sm text-[var(--muted)] py-12 border border-dashed border-[var(--border)] rounded-xl">
                  No local historical checkpoints found.
                </div>
              ) : (
                savedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="w-full flex items-center justify-between p-3 border border-[var(--border)] bg-[var(--bg)] hover:border-film-400 rounded-xl transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadSelect(proj.id)}
                      className="group flex-1 text-left cursor-pointer focus:outline-none"
                      aria-label={`Load project ${proj.name}`}
                    >
                      <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-film-600 transition-colors">
                        {proj.name}
                      </h4>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Saved {new Date(proj.updatedAt).toLocaleDateString()} at {new Date(proj.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSelect(proj.id, e)}
                      className="p-2 text-[var(--muted)] hover:text-film-500 rounded-lg hover:bg-[var(--border)]/40 transition-all cursor-pointer shrink-0"
                      aria-label={`Delete ${proj.name} checkpoint`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold text-[var(--muted)] hover:bg-[var(--border)]/30 transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}