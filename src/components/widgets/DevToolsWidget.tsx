"use client";

import { useState } from "react";
import { FileCode, Key, Hash, FileText, Copy, Check, AlertCircle } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: "json", label: "JSON", icon: <FileCode className="h-3 w-3" /> },
  { id: "jwt", label: "JWT", icon: <Key className="h-3 w-3" /> },
  { id: "regex", label: "Regex", icon: <Hash className="h-3 w-3" /> },
  { id: "base64", label: "Base64", icon: <FileText className="h-3 w-3" /> },
];

export function DevToolsWidget() {
  const [activeTab, setActiveTab] = useState("json");
  const [copied, setCopied] = useState<string | null>(null);

  const copyOutput = (output: string, label: string) => {
    navigator.clipboard.writeText(output);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const renderJsonTab = () => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleFormat = () => {
      try {
        const parsed = JSON.parse(input);
        setOutput(JSON.stringify(parsed, null, 2));
        setError(null);
      } catch (e) {
        setError("Invalid JSON");
        setOutput("");
      }
    };

    return (
      <div className="h-full flex flex-col p-3 space-y-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste JSON here... (e.g. {"key": "value"})'
            className="flex-1 bg-surface-2 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder-muted resize-y outline-none focus:border-indigo-500"
            rows={6}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleFormat}
              className="px-2 py-1.5 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
            >
              Format
            </button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-rose-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}

        <div className="flex-1 bg-surface-2 border border-custom rounded p-2 overflow-auto relative min-h-[150px]">
          {output && (
            <pre className="text-xs text-primary whitespace-pre-wrap font-mono">
              {output}
            </pre>
          )}
        </div>

        {output && (
          <button
            onClick={() => copyOutput(output, "json")}
            className="flex items-center gap-1 px-2 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            {copied === "json" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied === "json" ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    );
  };

  const renderJwtTab = () => {
    const [input, setInput] = useState("");
    const [header, setHeader] = useState("");
    const [payload, setPayload] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleDecode = () => {
      try {
        const parts = input.trim().split(".");
        if (parts.length !== 3) throw new Error("Invalid JWT format");

        const decode = (str: string) => {
          const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
          const json = atob(base64);
          return JSON.parse(json);
        };

        setHeader(JSON.stringify(decode(parts[0]), null, 2));
        setPayload(JSON.stringify(decode(parts[1]), null, 2));
        setError(null);
      } catch (e) {
        setError("Invalid JWT token");
        setHeader("");
        setPayload("");
      }
    };

    return (
      <div className="h-full flex flex-col p-3 space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste JWT token here..."
          className="flex-1 bg-surface-2 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder-muted resize-y outline-none focus:border-indigo-500"
          rows={4}
        />

        <button
          onClick={handleDecode}
          className="px-3 py-1.5 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
        >
          Decode
        </button>

        {error && (
          <div className="text-xs text-rose-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 flex-1">
          <div className="bg-surface-2 border border-custom rounded p-2 overflow-auto">
            <div className="text-xs text-muted mb-1">Header</div>
            <pre className="text-xs text-primary whitespace-pre-wrap font-mono">{header}</pre>
          </div>
          <div className="bg-surface-2 border border-custom rounded p-2 overflow-auto">
            <div className="text-xs text-muted mb-1">Payload</div>
            <pre className="text-xs text-primary whitespace-pre-wrap font-mono">{payload}</pre>
          </div>
        </div>
      </div>
    );
  };

  const renderRegexTab = () => {
    const [pattern, setPattern] = useState("");
    const [testString, setTestString] = useState("");
    const [matches, setMatches] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleTest = () => {
      try {
        const regex = new RegExp(pattern, "g");
        const matchArray = testString.match(regex);
        setMatches(matchArray || []);
        setError(null);
      } catch (e) {
        setError("Invalid regex pattern");
        setMatches([]);
      }
    };

    return (
      <div className="h-full flex flex-col p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <textarea
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Regex pattern (e.g. \\d+)"
            className="bg-surface-2 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder-muted resize-y outline-none focus:border-indigo-500"
            rows={3}
          />
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Test string..."
            className="bg-surface-2 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder-muted resize-y outline-none focus:border-indigo-500"
            rows={3}
          />
        </div>

        <button
          onClick={handleTest}
          className="px-3 py-1.5 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
        >
          Test
        </button>

        {error && (
          <div className="text-xs text-rose-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}

        <div className="flex-1 bg-surface-2 border border-custom rounded p-2 overflow-auto">
          <div className="text-xs text-muted mb-1">Matches ({matches.length})</div>
          {matches.length > 0 ? (
            <pre className="text-xs text-primary whitespace-pre-wrap font-mono">
              {matches.map((m, i) => `${i + 1}. ${m}`).join("\n")}
            </pre>
          ) : (
            <div className="text-muted">No matches found</div>
          )}
        </div>
      </div>
    );
  };

  const renderBase64Tab = () => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [mode, setMode] = useState<"encode" | "decode">("encode");

    const handleProcess = () => {
      try {
        if (mode === "encode") {
          setOutput(btoa(input));
        } else {
          setOutput(atob(input));
        }
      } catch {
        setOutput("Error: Invalid input");
      }
    };

    return (
      <div className="h-full flex flex-col p-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("encode")}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              mode === "encode"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-surface-2 text-secondary border-custom hover:bg-surface-3"
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode("decode")}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              mode === "decode"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-surface-2 text-secondary border-custom hover:bg-surface-3"
            }`}
          >
            Decode
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Input text..."
          className="flex-1 bg-surface-2 border border-custom rounded px-2 py-1.5 text-xs text-primary placeholder-muted resize-y outline-none focus:border-indigo-500"
          rows={5}
        />

        <button
          onClick={handleProcess}
          className="px-3 py-1.5 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
        >
          Process
        </button>

        <div className="flex-1 bg-surface-2 border border-custom rounded p-2 overflow-auto relative min-h-[80px]">
          {output && (
            <pre className="text-xs text-primary whitespace-pre-wrap font-mono">
              {output}
            </pre>
          )}
        </div>

        {output && (
          <button
            onClick={() => copyOutput(output, "base64")}
            className="flex items-center gap-1 px-2 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
          >
            {copied === "base64" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied === "base64" ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium text-primary">Dev Tools</span>
        </div>
      </div>

      <div className="flex gap-1 px-2 py-1 border-b border-custom overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-surface-2 text-primary border-b-2 border-indigo-500"
                : "text-muted hover:text-primary hover:bg-surface-2"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "json" && renderJsonTab()}
        {activeTab === "jwt" && renderJwtTab()}
        {activeTab === "regex" && renderRegexTab()}
        {activeTab === "base64" && renderBase64Tab()}
      </div>
    </div>
  );
}