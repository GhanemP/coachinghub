"use client";
import React, { useEffect, useState } from "react";

type ActionItem = {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  description?: string;
  createdById: string;
  assignedToId: string;
  sessionId?: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
};

type Session = {
  id: string;
  sessionNumber: number;
  status: string;
  actualDate?: string;
};


const statusToCol: Record<ActionItem["status"], Column | undefined> = {
  PENDING: "todo",
  IN_PROGRESS: "inprogress",
  COMPLETED: "done",
  OVERDUE: undefined,
  CANCELLED: undefined,
};

const colToStatus = {
  todo: "PENDING",
  inprogress: "IN_PROGRESS",
  done: "COMPLETED",
} as const;

type Column = "todo" | "inprogress" | "done";


interface KanbanBoardProps {
  onSessionChange?: (sessionId: string) => void;
  onUsersLoaded?: (users: User[]) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onSessionChange, onUsersLoaded }) => {
  // Manual refresh for sessions
  const refreshSessions = async () => {
    setLoading(true);
    const res = await fetch("/api/session");
    const data = await res.json();
    setSessions(data);
    setLoading(false);
  };
  const [items, setItems] = useState<ActionItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [dragged, setDragged] = useState<{ item: ActionItem; from: Column } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/action-item").then((res) => res.json()),
      fetch("/api/user").then((res) => res.json()),
      fetch("/api/session").then((res) => res.json()),
    ])
      .then(([items, users, sessions]) => {
        setItems(items);
        setUsers(users);
        if (onUsersLoaded) onUsersLoaded(users);
        setSessions(sessions);
        if (users.length > 0) setSelectedUser(users[0].id);
        if (sessions.length > 0) {
          setSelectedSession(sessions[0].id);
          if (onSessionChange) onSessionChange(sessions[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [onSessionChange, onUsersLoaded]);

  const onDragStart = (item: ActionItem, from: Column) => {
    setDragged({ item, from });
  };

  const onDrop = async (to: Column) => {
    if (!dragged) return;
    const currentCol = statusToCol[dragged.item.status];
    if (currentCol === to) return;
    if (!colToStatus[to]) return;
    // Only allow moving between mapped statuses
    await fetch(`/api/action-item/${dragged.item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colToStatus[to] }),
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === dragged.item.id ? { ...i, status: colToStatus[to] } : i
      )
    );
    setDragged(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const addItem = async () => {
    const title = prompt("Enter new action item:");
    if (!title) return;
    if (!selectedUser || !selectedSession) {
      alert("Please select a user and session.");
      return;
    }
    const res = await fetch("/api/action-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        createdById: selectedUser,
        assignedToId: selectedUser,
        sessionId: selectedSession,
      }),
    });
    if (!res.ok) {
      alert("Failed to create action item");
      return;
    }
    const newItem = await res.json();
    setItems((prev) => [...prev, newItem]);
  };

  const columns: { key: Column; label: string }[] = [
    { key: "todo", label: "To Do" },
    { key: "inprogress", label: "In Progress" },
    { key: "done", label: "Done" },
  ];

  const itemsByCol: Record<Column, ActionItem[]> = {
    todo: items.filter((i) => i.status === "PENDING"),
    inprogress: items.filter((i) => i.status === "IN_PROGRESS"),
    done: items.filter((i) => i.status === "COMPLETED"),
  };

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1">User</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border rounded px-2 py-1"
            title="Select user"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Session</label>
          <select
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              if (onSessionChange) onSessionChange(e.target.value);
            }}
            className="border rounded px-2 py-1"
            title="Select session"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session #{s.sessionNumber}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-4">
        {/* Previous Sessions Column */}
        <div className="w-1/4 bg-gray-50 rounded p-4 min-h-[300px]">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Previous Sessions</h4>
            <button
              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
              onClick={refreshSessions}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {sessions.filter(s => s.status === "COMPLETED").length === 0 && (
              <div className="text-gray-400">No completed sessions.</div>
            )}
            {sessions.filter(s => s.status === "COMPLETED").map(s => (
              <div key={s.id} className="bg-white rounded shadow p-2 border border-gray-200">
                <div className="font-semibold">Session #{s.sessionNumber}</div>
                <div className="text-xs text-gray-500">Date: {s.actualDate ? new Date(s.actualDate).toLocaleDateString() : "-"}</div>
              </div>
            ))}
          </div>
        </div>
        {/* ...existing code... (other columns) */}
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex-1 bg-gray-100 rounded p-4 min-h-[300px]"
            onDrop={() => onDrop(col.key)}
            onDragOver={onDragOver}
          >
            <h4 className="font-semibold mb-2">{col.label}</h4>
            <div className="flex flex-col gap-2">
              {loading && <div className="text-gray-400">Loading...</div>}
              {itemsByCol[col.key].map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded shadow p-2 cursor-move border border-gray-200 hover:bg-blue-50"
                  draggable
                  onDragStart={() => onDragStart(item, col.key)}
                >
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-xs text-gray-500">Priority: {item.priority}</div>
                  <div className="text-xs text-gray-500">Assigned: {users.find(u => u.id === item.assignedToId)?.firstName || item.assignedToId}</div>
                  {item.dueDate && <div className="text-xs text-gray-400">Due: {item.dueDate.slice(0,10)}</div>}
                </div>
              ))}
            </div>
            {col.key === "todo" && (
              <button
                className="mt-4 px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600"
                onClick={addItem}
              >
                + Add Action Item
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
