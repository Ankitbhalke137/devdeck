import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { ArrowRight, Clock, AlertTriangle } from "lucide-react";

interface Link {
  id: string;
  title: string;
  url: string;
  status: "OK" | "ERROR" | "PENDING";
  latencyMs?: number;
  lastChecked?: string;
}

const sampleLinks: Link[] = [
  {
    id: "1",
    title: "Staging API",
    url: "https://staging-api.example.com",
    status: "OK",
    latencyMs: 42,
    lastChecked: "5m ago",
  },
  {
    id: "2",
    title: "Main Project Repo",
    url: "https://github.com/yourorg/devdeck",
    status: "OK",
    latencyMs: 8,
    lastChecked: "2h ago",
  },
  {
    id: "3",
    title: "Documentation Site",
    url: "https://docs.vercel.com",
    status: "OK",
    latencyMs: 15,
    lastChecked: "30m ago",
  },
  {
    id: "4",
    title: "CI/CD Pipeline",
    url: "https://ci.example.com",
    status: "ERROR",
    latencyMs: 120,
    lastChecked: "10m ago",
  },
  {
    id: "5",
    title: "Feature Branch",
    url: "https://github.com/yourorg/feature-branch",
    status: "PENDING",
    lastChecked: "just now",
  },
];

export function ResourceHubWidget() {
  const [links, setLinks] = useState<Link[]>(sampleLinks);
  const [refresh, setRefresh] = useState(false);

  const checkLink = (link: Link) => {
    // Simulate health check delay
    setTimeout(() => {
      const isHealthy = Math.random() > 0.3; // 70% chance of OK
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id
            ? { ...l, status: isHealthy ? "OK" : "ERROR", latencyMs: Math.random() * 100 } as Link
            : l
        )
      );
    }, 800);
  };

  const handleRefresh = () => {
    setRefresh(true);
    setTimeout(() => {
      // Re-check all links
      setLinks((prev) =>
        prev.map((link) => ({
          ...link,
          lastChecked: "just now",
          status: Math.random() > 0.3 ? "OK" : ("ERROR" as const),
          latencyMs: Math.random() * 100,
        }))
      );
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-primary">Resource Hub</span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 px-3 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
        >
          <Clock className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-surface-2 border border-custom"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-medium">
              {link.title.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary">{link.title}</div>
              <div className="text-xs text-muted truncate">{link.url}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  link.status === "OK"
                    ? "text-emerald-500"
                    : link.status === "ERROR"
                    ? "text-rose-500"
                    : "text-amber-500"
                }`}
              >
                {link.status}
              </span>
              {link.latencyMs !== undefined && (
                <span className="text-xs text-muted">{link.latencyMs.toFixed(0)}ms</span>
              )}
              {link.lastChecked && (
                <span className="text-xs text-muted">{link.lastChecked}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-custom text-xs text-muted">
        {links.length} monitored links •{" "}
        {links.filter((l) => l.status === "ERROR").length} issues detected
      </div>
    </div>
  );
}
