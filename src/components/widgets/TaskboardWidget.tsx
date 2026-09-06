"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState, useEffect } from "react";
import {
  List,
  Plus,
  Trash2,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  tags?: string[];
  assignee?: string;
  prUrl?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Implement JWT authentication",
    description: "Add NextAuth.js with Google OAuth 2.0 provider",
    status: "TODO",
    priority: "HIGH",
    tags: ["backend", "auth"],
    assignee: "John Doe",
    subtasks: [
      { id: "1a", title: "Configure NextAuth.js", completed: true },
      { id: "1b", title: "Add Google OAuth provider", completed: false },
      { id: "1c", title: "Create API routes for auth", completed: false },
    ],
  },
  {
    id: "2",
    title: "Design dashboard layout",
    description: "Create wireframes for the main DevDeck interface",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    tags: ["design", "frontend"],
    assignee: "Jane Smith",
    prUrl: "https://github.com/yourname/devdeck/pull/14",
    subtasks: [
      { id: "2a", title: "Create low-fi wireframes", completed: true },
      { id: "2b", title: "Design component library", completed: false },
    ],
  },
  {
    id: "3",
    title: "Fix mobile responsive issues",
    description: "Ensure proper layout on tablets and mobile devices",
    status: "TODO",
    priority: "MEDIUM",
    tags: ["bug", "frontend"],
    assignee: "Alex Johnson",
    subtasks: [
      { id: "3a", title: "Test on iPhone viewport", completed: false },
      { id: "3b", title: "Test on Android viewport", completed: false },
    ],
  },
];

const statusColumns = [
  { id: "TODO", title: "To Do", color: "text-muted" },
  { id: "IN_PROGRESS", title: "In Progress", color: "text-sky-500" },
  { id: "IN_REVIEW", title: "In Review", color: "text-amber-500" },
  { id: "DONE", title: "Done", color: "text-emerald-500" },
];

const priorityColors: Record<Task["priority"], string> = {
  LOW: "text-muted",
  MEDIUM: "text-amber-500",
  HIGH: "text-rose-500",
  URGENT: "text-red-600",
};

export function TaskboardWidget() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  })
);

  const handleDragStart = (event: { active: { id: any } }) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: {
    active: { id: any };
    over: { id: any } | null;
  }) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    setTasks((prev) => {
      const activeTaskIndex = prev.findIndex((task) => task.id === activeIdStr);
      const overTaskIndex = prev.findIndex((task) => task.id === overIdStr);

      if (activeTaskIndex === -1 || overTaskIndex === -1) return prev;

      const activeTask = prev[activeTaskIndex];
      const overTask = prev[overTaskIndex];

      if (activeTask.status === overTask.status) {
        // Same column, reorder
        return arrayMove(prev, activeTaskIndex, overTaskIndex);
      } else {
        // Different column, move task
        const updatedTask = { ...activeTask, status: overIdStr as Task["status"] };
        return [
          ...prev.slice(0, activeTaskIndex),
          ...prev.slice(activeTaskIndex + 1),
        ].map((task, index) =>
          index < overTaskIndex
            ? task
            : index === overTaskIndex
            ? updatedTask
            : task
        );
      }
    });

    setActiveId(null);
  };

  const handleAddTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: "New Task",
      status: "TODO",
      priority: "MEDIUM",
      tags: [],
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: (task.subtasks ?? []).map((subtask) =>
                subtask.id === subtaskId
                  ? { ...subtask, completed: !subtask.completed }
                  : subtask
              ),
            }
          : task
      )
    );
  };

  const groupedTasks = statusColumns.reduce(
    (acc, column) => {
      acc[column.id as Task["status"]] = tasks.filter((task) => task.status === column.id);
      return acc;
    },
    {} as Record<Task["status"], Task[]>
  );

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-custom">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-sky-500" />
          <span className="text-xs font-medium text-primary">Task Engine</span>
        </div>
        <button
          onClick={handleAddTask}
          className="flex items-center gap-1 px-2 py-1 text-xs text-secondary bg-surface-2 hover:bg-surface-3 rounded border border-custom transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto space-x-2 px-3 py-2 overflow-y-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {statusColumns.map((column) => (
              <div
                key={column.id}
                className="min-w-[180px] flex flex-col space-y-2"
                data-column-id={column.id}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded border border-custom">
                  <span className="text-xs font-medium">{column.title}</span>
                  <span className={`text-xs ${column.color}`}>
                    {groupedTasks[column.id as Task["status"]].length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {groupedTasks[column.id as Task["status"]].map((task) => (
                    <div
                      key={task.id}
                      data-id={task.id}
                      className="relative bg-surface-2 rounded border border-custom p-3 cursor-move transition-all"
                      style={{ transform: activeId === task.id ? "scale(1.01)" : "scale(1)" }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-primary line-clamp-2">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs ${priorityColors[task.priority]} rounded px-1.5 py-0.5`}
                          >
                            {task.priority}
                          </span>
                          {task.prUrl && (
                            <a
                              href={task.prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:text-indigo-400"
                            >
                              PR #{task.prUrl.split("/").pop()}
                            </a>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-muted bg-surface-3 rounded px-2 py-0.5"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-surface-3">
                          {task.subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={subtask.completed}
                                onChange={() => handleToggleSubtask(task.id, subtask.id)}
                                className="h-3 w-3 text-indigo-500"
                              />
                              <span
                                className={`${subtask.completed ? "line-through text-muted" : ""}`}
                              >
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-surface-3 flex justify-between text-xs">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-rose-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </DndContext>
      </div>

      <div className="p-3 border-t border-custom text-xs text-muted">
        {tasks.length} total tasks • {tasks.filter((t) => t.status === "DONE").length} completed
      </div>
    </div>
  );
}