"use client";
import React, { useState, useEffect } from "react";


type SessionNote = {
  id: string;
  content: string;
  timestamp: string;
  isQuickNote: boolean;
  category?: string;
};


interface NotesProps {
  sessionId?: string;
}

const Notes: React.FC<NotesProps> = ({ sessionId }) => {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isQuickNote, setIsQuickNote] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/session-note?sessionId=${sessionId}`)
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const addNote = async () => {
    if (!content.trim() || !sessionId) return;
    setLoading(true);
    const res = await fetch("/api/session-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        content,
        category: category || null,
        isQuickNote,
      }),
    });
    if (res.ok) {
      const newNote = await res.json();
      setNotes((prev) => [newNote, ...prev]);
      setContent("");
      setCategory("");
      setIsQuickNote(false);
    }
    setLoading(false);
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-2">Session Notes</h3>
      <div className="mb-2 flex gap-2">
        <input
          className="flex-1 border rounded p-2"
          placeholder="Add a note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <select
          className="border rounded px-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          title="Select note category"
        >
          <option value="">Category</option>
          <option value="strength">Strength</option>
          <option value="improvement">Improvement</option>
          <option value="observation">Observation</option>
        </select>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={isQuickNote}
            onChange={(e) => setIsQuickNote(e.target.checked)}
          />
          Quick
        </label>
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600"
          onClick={addNote}
          disabled={loading || !content.trim()}
        >
          Add
        </button>
      </div>
      <div className="space-y-2">
        {loading && <div className="text-gray-400">Loading...</div>}
        {notes.map((note) => (
          <div key={note.id} className="bg-white rounded shadow p-2 border border-gray-200">
            <div className="text-sm">{note.content}</div>
            <div className="text-xs text-gray-500 flex gap-2 mt-1">
              {note.category && <span>Category: {note.category}</span>}
              {note.isQuickNote && <span>Quick</span>}
              <span>{note.timestamp.slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notes;
