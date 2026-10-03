import React, { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Code,
  Eye,
  ChevronDown,
  Sparkles,
} from "lucide-react";

interface RichTextControlProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  helpText?: string;
}

const PRESET_COLORS = [
  { name: "Default White", color: "#ffffff" },
  { name: "Muted Zinc", color: "#a1a1aa" },
  { name: "Vibrant Purple", color: "#c18dec" },
  { name: "Bright Emerald", color: "#34d399" },
  { name: "Warm Amber", color: "#fbbf24" },
  { name: "Sky Blue", color: "#38bdf8" },
  { name: "Soft Rose", color: "#fb7185" },
];

const PRESET_HIGHLIGHTS = [
  { name: "None", color: "transparent" },
  { name: "Purple Glow", color: "rgba(193, 141, 236, 0.25)" },
  { name: "Emerald Glow", color: "rgba(52, 211, 153, 0.25)" },
  { name: "Amber Glow", color: "rgba(251, 191, 36, 0.25)" },
  { name: "Blue Glow", color: "rgba(56, 189, 248, 0.25)" },
];

export const RichTextControl: React.FC<RichTextControlProps> = ({
  label,
  value = "",
  onChange,
  placeholder = "Enter text...",
  multiline = false,
  helpText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isRawMode, setIsRawMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#c18dec");
  const [fontSize, setFontSize] = useState("16px");
  const [fontWeight, setFontWeight] = useState("400");
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("left");
  const isUpdatingFromProps = useRef(false);

  // Sync internal innerHTML when props change externally
  useEffect(() => {
    if (editorRef.current && !isRawMode) {
      if (editorRef.current.innerHTML !== (value || "")) {
        isUpdatingFromProps.current = true;
        editorRef.current.innerHTML = value || "";
        isUpdatingFromProps.current = false;
      }
    }
  }, [value, isRawMode]);

  const handleInput = () => {
    if (isUpdatingFromProps.current) return;
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Clean empty break tags or trailing whitespace
      const cleaned = html === "<br>" ? "" : html;
      onChange(cleaned);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only blur if focus leaves the container entirely
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
      setShowColorPicker(false);
      setShowHighlightPicker(false);
    }
  };

  // Helper command execution on selection
  const execCmd = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Format selection with inline style tag
  const applyInlineStyle = (styleProperty: string, styleValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.setProperty(styleProperty, styleValue);

    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      selection.removeAllRanges();
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    } catch (e) {
      console.warn("Could not apply inline style:", e);
    }
  };

  // Custom inline text color
  const applyTextColor = (color: string) => {
    applyInlineStyle("color", color);
    setShowColorPicker(false);
  };

  // Custom inline highlight background
  const applyHighlightColor = (bgColor: string) => {
    if (bgColor === "transparent") {
      applyInlineStyle("background-color", "transparent");
    } else {
      applyInlineStyle("background-color", bgColor);
    }
    setShowHighlightPicker(false);
  };

  // Apply block alignment
  const applyAlignment = (align: "left" | "center" | "right") => {
    setAlignment(align);
    execCmd(
      align === "left"
        ? "justifyLeft"
        : align === "center"
        ? "justifyCenter"
        : "justifyRight"
    );
  };

  return (
    <div
      ref={containerRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="space-y-1.5 transition-all duration-200"
    >
      {/* Label and Mode Switch */}
      <div className="flex items-center justify-between">
        <label
          className={`block text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
            isFocused ? "text-purple-300" : "text-zinc-400"
          }`}
        >
          <Type className={`w-3.5 h-3.5 ${isFocused ? "text-purple-400" : "text-zinc-500"}`} />
          {label}
        </label>
        {isFocused && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsRawMode(!isRawMode)}
            className="text-[10px] font-mono text-zinc-400 hover:text-purple-300 flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60 transition-colors"
            title={isRawMode ? "Switch to Visual Rich Text Editor" : "Switch to Raw HTML Code View"}
          >
            {isRawMode ? (
              <>
                <Eye className="w-3 h-3 text-purple-400" /> Visual Mode
              </>
            ) : (
              <>
                <Code className="w-3 h-3 text-purple-400" /> HTML View
              </>
            )}
          </button>
        )}
      </div>

      {helpText && isFocused && (
        <p className="text-[11px] text-zinc-500 italic mb-1">{helpText}</p>
      )}

      {/* Editor Container */}
      <div
        className={`bg-[#121214] border rounded-xl overflow-hidden transition-all duration-200 ${
          isFocused
            ? "border-purple-500/60 shadow-lg shadow-purple-950/20 ring-1 ring-purple-500/20"
            : "border-zinc-800 hover:border-zinc-700"
        }`}
      >
        {/* Formatting Toolbar - Context Aware: Only visible when focused in Visual Mode */}
        {isFocused && !isRawMode && (
          <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#18181b] border-b border-zinc-800/80 select-none animate-fade-in">
            {/* Bold */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("bold")}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("italic")}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("underline")}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("strikeThrough")}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Text Color Dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                }}
                className="p-1.5 rounded-md hover:bg-zinc-700 text-purple-300 hover:text-purple-200 flex items-center gap-1 transition-colors text-xs"
                title="Change Text Color of Selection"
              >
                <Palette className="w-3.5 h-3.5" />
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 p-2.5 bg-[#1f1f23] border border-zinc-700 rounded-xl shadow-2xl space-y-2 w-48 animate-fade-in">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Text Color
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyTextColor(c.color)}
                        className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <div className="pt-1 border-t border-zinc-800 flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">Custom:</span>
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        applyTextColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Highlight Background Dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                }}
                className="p-1.5 rounded-md hover:bg-zinc-700 text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors text-xs"
                title="Highlight Selection"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 p-2.5 bg-[#1f1f23] border border-zinc-700 rounded-xl shadow-2xl space-y-2 w-48 animate-fade-in">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Highlight Background
                  </p>
                  <div className="space-y-1">
                    {PRESET_HIGHLIGHTS.map((h) => (
                      <button
                        key={h.name}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyHighlightColor(h.color)}
                        className="w-full text-left px-2 py-1 rounded text-xs text-zinc-200 hover:bg-zinc-700 flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-zinc-600"
                          style={{ backgroundColor: h.color }}
                        />
                        {h.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Inline Font Size */}
            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                applyInlineStyle("font-size", e.target.value);
              }}
              className="bg-zinc-800 text-zinc-200 text-[11px] px-1.5 py-1 rounded border border-zinc-700 outline-none cursor-pointer"
              title="Font Size for Selected Text"
            >
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="24px">24px</option>
              <option value="30px">30px</option>
              <option value="36px">36px</option>
            </select>

            {/* Inline Font Weight */}
            <select
              value={fontWeight}
              onChange={(e) => {
                setFontWeight(e.target.value);
                applyInlineStyle("font-weight", e.target.value);
              }}
              className="bg-zinc-800 text-zinc-200 text-[11px] px-1.5 py-1 rounded border border-zinc-700 outline-none cursor-pointer"
              title="Font Weight for Selected Text"
            >
              <option value="300">Light (300)</option>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">SemiBold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="900">Black (900)</option>
            </select>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Alignments */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyAlignment("left")}
              className={`p-1.5 rounded-md hover:bg-zinc-700 transition-colors ${
                alignment === "left" ? "bg-zinc-700 text-purple-400" : "text-zinc-400"
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyAlignment("center")}
              className={`p-1.5 rounded-md hover:bg-zinc-700 transition-colors ${
                alignment === "center" ? "bg-zinc-700 text-purple-400" : "text-zinc-400"
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyAlignment("right")}
              className={`p-1.5 rounded-md hover:bg-zinc-700 transition-colors ${
                alignment === "right" ? "bg-zinc-700 text-purple-400" : "text-zinc-400"
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editor Body */}
        {isRawMode ? (
          <textarea
            rows={multiline ? 4 : 2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 bg-[#121214] text-zinc-200 text-xs font-mono outline-none resize-y leading-relaxed"
            placeholder={placeholder}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            className={`w-full p-3 text-zinc-100 text-sm outline-none font-sans leading-relaxed focus:bg-zinc-900/40 transition-colors cursor-text ${
              multiline ? "min-h-[90px] max-h-[300px] overflow-y-auto" : "min-h-[44px]"
            }`}
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            data-placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};

export default RichTextControl;
