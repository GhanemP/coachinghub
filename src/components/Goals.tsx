"use client";
import React, { useEffect, useState } from "react";

type Goal = {
  id: string;
  title: string;
  description: string;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
  category: string;
  targetValue?: string;
  currentValue?: string;
  startDate: string;
  targetDate: string;
  completedDate?: string;
  createdById: string;
  assignedToId: string;
  sessionId?: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
};

interface GoalsProps {
  sessionId?: string;
  users?: User[];
}

const Goals: React.FC<GoalsProps> = ({ sessionId, users = [] }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [category, setCategory] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/goal?sessionId=${sessionId}`)
      .then((res) => res.json())
      .then((data) => setGoals(data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const addGoal = async () => {
    if (!title.trim() || !assignedTo || !sessionId) return;
    setLoading(true);
    const res = await fetch("/api/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        assignedToId: assignedTo,
        createdById: assignedTo, // For demo, assigner is creator
        sessionId,
        category,
        targetValue,
        targetDate,
      }),
    });
    if (res.ok) {
      const newGoal = await res.json();
      setGoals((prev) => [newGoal, ...prev]);
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setCategory("");
      setTargetValue("");
      setTargetDate("");
    }
    setLoading(false);
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-2">Goals</h3>
      <div className="mb-2 flex flex-col gap-2">
        <input
          className="border rounded p-2"
          placeholder="Goal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border rounded p-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Category (e.g. communication)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Target Value"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Target Date (YYYY-MM-DD)"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          type="date"
        />
        <select
          className="border rounded p-2"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          title="Assign to user"
        >
          <option value="">Assign to...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600"
          onClick={addGoal}
          disabled={loading || !title.trim() || !assignedTo}
        >
          Add Goal
        </button>
      </div>
      <div className="space-y-2 mt-4">
        {loading && <div className="text-gray-400">Loading...</div>}
        {goals.map((goal) => (
          <div key={goal.id} className="bg-white rounded shadow p-2 border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="font-semibold">{goal.title}</div>
              <button
                className="text-xs text-red-500 hover:underline"
                title="Delete goal"
                onClick={async () => {
                  if (!window.confirm("Delete this goal?")) return;
                  setLoading(true);
                  const res = await fetch(`/api/goal/${goal.id}`, { method: "DELETE" });
                  if (res.ok) setGoals((prev) => prev.filter((g) => g.id !== goal.id));
                  setLoading(false);
                }}
              >
                Delete
              </button>
            </div>
            <div className="text-xs text-gray-500">Assigned: {users.find(u => u.id === goal.assignedToId)?.firstName || goal.assignedToId}</div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              Status:
              <select
                className="border rounded px-1 py-0.5 text-xs"
                value={goal.status}
                onChange={async (e) => {
                  const newStatus = e.target.value as Goal["status"];
                  setLoading(true);
                  const res = await fetch(`/api/goal/${goal.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: updated.status } : g));
                  }
                  setLoading(false);
                }}
                title="Update goal status"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="text-xs text-gray-400">Target: {goal.targetValue} by {goal.targetDate?.slice(0,10)}</div>
            <div className="text-xs text-gray-400">Category: {goal.category}</div>
            <div className="text-xs text-gray-400">{goal.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Goals;
