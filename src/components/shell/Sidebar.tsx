"use client";

import { Menu, ChevronDown, LogOut, Search, Plus, Settings, Home, Brain, List, MessageCircle, Headphones, Monitor, Shield, Folder } from "lucide-react";
import { useState } from "react";

const navItems = [
  { key: "dashboard", label: "Dashboard Grid", icon: Home },
  { key: "tasks", label: "Task Engine", icon: List },
  { key: "ai", label: "AI Assistant", icon: Brain },
  { key: "resources", label: "Resource Hub", icon: Folder },
  { key: "dev-tools", label: "Dev Tools", icon: Shield },
  { key: "chat", label: "Chat Channels", icon: MessageCircle },
  { key: "focus", label: "Focus Station", icon: Headphones },
  { key: "settings", label: "Settings", icon: Settings },
];

export interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  return (
    <aside
      className="w-64 h-full bg-surface-1 border-right border-custom flex flex-col min-h-screen shadow-lg"
      style={{ width: isExpanded ? "160px" : "48px" }}
    >
      <div className="h-14 border-b border-custom flex items-center justify-between px-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 p-1 rounded-custom hover:bg-surface-2 transition-colors"
          aria-label="Expand sidebar"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <span className="hidden sm:text-sm text-primary">DevDeck</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="space-y-1 px-1">
          {navItems.map((item) => (
            <li
              key={item.key}
              className={`flex items-center gap-2 rounded-custom px-2 py-1.5 text-sm text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors ${isExpanded ? "" : "hidden"} ${item.key === "dashboard" ? "font-medium text-primary" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              {isExpanded ? <span>{item.label}</span> : null}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-2 border-t border-custom mt-auto">
        <button
          className="w-full flex items-center justify-center py-2 rounded-custom text-sm text-secondary bg-surface-3 hover:bg-surface-2 hover:text-text-primary transition-colors"
          aria-label="Add widget"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Widget
        </button>
      </div>
    </aside>
  );
}