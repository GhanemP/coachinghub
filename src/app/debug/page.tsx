'use client';

import { useSession } from 'next-auth/react';

export default function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Session</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">Session Status</h2>
        <p><strong>Status:</strong> {status}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">Session Data</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        {session?.user ? (
          <div>
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>Name:</strong> {session.user.name}</p>
            <p><strong>Role:</strong> {session.user.role}</p>
            <p><strong>ID:</strong> {session.user.id}</p>
          </div>
        ) : (
          <p>No user data available</p>
        )}
      </div>
    </div>
  );
}
