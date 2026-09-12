"use client";

import {
  DndContext,
  DragOverlay,
  rectIntersection,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";
import {
  List,
  Plus,
  Trash2,
  Pencil,
  X,
  GripVertical,
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

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem("devdeck.tasks.v1");
    if (saved) {
      const parsed = JSON.parse(saved) as Task[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return initialTasks;
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem("devdeck.tasks.v1", JSON.stringify(tasks));
}

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

/* ── Sortable Task Card ────────────────────────────────────────── */

function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onToggleSubtask,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-surface-2 rounded border border-custom p-3 min-h-[100px] transition-shadow ${
        isDragging ? "shadow-lg shadow-indigo-500/10 z-50" : ""
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 text-muted hover:text-primary cursor-grab active:cursor-grabbing rounded hover:bg-surface-3 transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="flex justify-between items-start mb-2 pr-6">
        <h4 className="text-sm font-medium text-primary line-clamp-2">
          {task.title}
        </h4>
        <span className={`text-xs ${priorityColors[task.priority]} rounded px-1.5 py-0.5 flex-shrink-0`}>
          {task.priority}
        </span>
      </div>

      {task.prUrl && (
        <a
          href={task.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-indigo-500 hover:text-indigo-400 block mb-1"
        >
          PR #{task.prUrl.split("/").pop()}
        </a>
      )}

      {task.description && (
        <p className="text-xs text-muted line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-[10px] text-muted bg-surface-3 rounded px-1.5 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-surface-3">
          {task.subtasks.map((subtask) => (
            <label key={subtask.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => onToggleSubtask(task.id, subtask.id)}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-3 w-3 text-indigo-500"
              />
              <span className={subtask.completed ? "line-through text-muted" : ""}>
                {subtask.title}
              </span>
            </label>
          ))}
        </div>
      )}

      {task.assignee && (
        <div className="mt-2 pt-2 border-t border-surface-3 text-[10px] text-muted">
          {task.assignee}
        </div>
      )}

      {/* Edit / Delete */}
      <div className="absolute bottom-2 left-3 right-3 flex justify-between text-xs opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity">
        {/* always visible on hover via parent group */}
      </div>
      <div className="mt-2 pt-2 border-t border-surface-3 flex justify-between text-xs">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 text-sky-500 hover:text-sky-400 hover:bg-surface-3 rounded transition-colors"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 text-rose-500 hover:text-rose-400 hover:bg-surface-3 rounded transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Droppable Column Container ─────────────────────────────── */

function DroppableColumn({
  column,
  tasks,
  onEditTask,
  onDeleteTask,
  onToggleSubtask,
}: {
  column: { id: string; title: string; color: string };
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-45 w-45 flex flex-col rounded-lg p-1 transition-colors ${
        isOver ? "bg-indigo-500/10 ring-1 ring-indigo-500/40" : ""
      }`}
      data-column-id={column.id}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded border border-custom mb-2">
        <span className="text-xs font-medium">{column.title}</span>
        <span className={`text-xs ${column.color}`}>
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-12 pb-6">
          {tasks.length === 0 ? (
            <div className="h-20 border border-dashed border-custom rounded flex items-center justify-center text-[10px] text-muted select-none">
              Drop here
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleSubtask={onToggleSubtask}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ── Overlay clone for the dragged card ────────────────────────── */

function DragOverlayCard({ task }: { task: Task }) {
  return (
    <div className="bg-surface-2 rounded border border-indigo-500/40 p-3 shadow-2xl shadow-indigo-500/20 rotate-2 w-45">
      <h4 className="text-sm font-medium text-primary line-clamp-2">{task.title}</h4>
      <span className={`text-xs ${priorityColors[task.priority]} mt-1 inline-block`}>
        {task.priority}
      </span>
    </div>
  );
}

/* ── Main Widget ───────────────────────────────────────────────── */

export function TaskboardWidget() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Task["priority"],
    status: "TODO" as Task["status"],
    tags: "",
    assignee: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Sync across tabs via window storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "devdeck.tasks.v1" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setTasks(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    setTasks((prev) => {
      const activeTask = prev.find((t) => t.id === activeIdStr);
      if (!activeTask) return prev;

      // Dropped on a column header (column id like "TODO")
      const targetColumn = statusColumns.find((c) => c.id === overIdStr);
      if (targetColumn && activeTask.status !== targetColumn.id) {
        return prev.map((t) => (t.id === activeIdStr ? { ...t, status: targetColumn.id as Task["status"] } : t));
      }

      // Dropped on another task
      const overTask = prev.find((t) => t.id === overIdStr);
      if (!overTask) return prev;

      if (activeTask.status === overTask.status) {
        // Same column → reorder
        const colTasks = prev.filter((t) => t.status === activeTask.status);
        const otherTasks = prev.filter((t) => t.status !== activeTask.status);
        const oldIdx = colTasks.findIndex((t) => t.id === activeIdStr);
        const newIdx = colTasks.findIndex((t) => t.id === overIdStr);
        return [...otherTasks, ...arrayMove(colTasks, oldIdx, newIdx)];
      }

      // Different column → move
      return prev.map((t) => (t.id === activeIdStr ? { ...t, status: overTask.status } : t));
    });
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
                subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
              ),
            }
          : task
      )
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      tags: task.tags?.join(", ") || "",
      assignee: task.assignee || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === editingTask.id
          ? {
              ...task,
              title: editForm.title,
              description: editForm.description,
              priority: editForm.priority,
              status: editForm.status,
              tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
              assignee: editForm.assignee,
            }
          : task
      )
    );
    setEditingTask(null);
  };

  const groupedTasks = statusColumns.reduce(
    (acc, column) => {
      acc[column.id as Task["status"]] = tasks.filter((task) => task.status === column.id);
      return acc;
    },
    {} as Record<Task["status"], Task[]>
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  return (
    <div className="h-full flex flex-col bg-surface-1 rounded-lg border border-custom overflow-hidden">
      <div className="widget-header flex items-center justify-between px-3 py-2 border-b border-custom">
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

      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full flex gap-2 px-3 py-2 overflow-x-auto">
            {statusColumns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={groupedTasks[column.id as Task["status"]]}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleSubtask={handleToggleSubtask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <DragOverlayCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="p-3 border-t border-custom text-xs text-muted">
        {tasks.length} total tasks · {tasks.filter((t) => t.status === "DONE").length} completed
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-2 rounded-lg border border-custom p-4 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-primary">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-muted hover:text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500 h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Task["priority"] })}
                    className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Task["status"] })}
                    className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                  placeholder="backend, auth, frontend"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Assignee</label>
                <input
                  type="text"
                  value={editForm.assignee}
                  onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface-1 border border-custom rounded text-primary focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingTask(null)}
                className="px-3 py-1.5 text-xs text-muted bg-surface-1 hover:bg-surface-3 rounded border border-custom transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs text-primary bg-sky-600 hover:bg-sky-500 rounded border border-custom transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
