"use client";
import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Session {
  id: string;
  sessionNumber: number;
  type: string;
  status: string;
  scheduledDate: string;
  duration?: number;
  overallScore?: number;
  summary?: string;
  teamLeaderId?: string;
  agentId?: string;
}

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedDate?: string;
  sessionId?: string;
  assignedTo?: User;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue?: string;
  currentValue?: string;
  progress?: number;
}

interface AgentMetrics {
  metrics: {
    CSAT?: { value: number; unit: string; period: string };
    FCR?: { value: number; unit: string; period: string };
    'Quality Score'?: { value: number; unit: string; period: string };
    AHT?: { value: number; unit: string; period: string };
  };
  overallScore: number;
  period: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<string>("notes");
  const [timer, setTimer] = useState<string>("00:00");
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSessionPaused, setIsSessionPaused] = useState<boolean>(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Track elapsed seconds
  const [notes, setNotes] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  
  // Database state
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [previousSessions, setPreviousSessions] = useState<Session[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showActionItemForm, setShowActionItemForm] = useState<boolean>(false);
  const [newActionItem, setNewActionItem] = useState({ 
    title: '', 
    description: '', 
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    dueDate: '',
    assignedToId: ''
  });
  const [selectedPreviousSession, setSelectedPreviousSession] = useState<Session | null>(null);
  const [actionItemFilter, setActionItemFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [sortActionItemsBy, setSortActionItemsBy] = useState<'dueDate' | 'priority' | 'status' | 'created'>('dueDate');
  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
type AgentUser = User & { department?: string; tenure?: string };
const [agents, setAgents] = useState<AgentUser[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  
  // Agent metrics state
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  
  // Widget position state
  const [widgetPosition, setWidgetPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Helper function to fetch agent metrics
  const fetchAgentMetrics = async (userId: string) => {
    if (!userId) return;
    setIsLoadingMetrics(true);
    try {
      const response = await fetch(`/api/agent-metrics?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setAgentMetrics(data);
      } else {
        console.error('Failed to fetch agent metrics');
        setAgentMetrics(null);
      }
    } catch (error) {
      console.error('Error fetching agent metrics:', error);
      setAgentMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Helper function to refresh session data
  const refreshSessions = async () => {
    try {
      const sessionsRes = await fetch('/api/session');
      const sessions = await sessionsRes.json();
      
      // Show all sessions (completed, draft, etc.) sorted by most recent first
      const allSessions = sessions
        .filter((s: Session) => s.status !== 'ACTIVE' && s.status !== 'PAUSED') // Don't show currently active sessions
        .sort((a: Session, b: Session) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
      
      setPreviousSessions(allSessions);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  };

  // Helper function to calculate progress percentage for goals
  const calculateProgress = (goal: Goal): number => {
    if (goal.progress !== undefined) return goal.progress;
    
    // Try to parse currentValue and targetValue if they're numeric strings
    const current = parseFloat(goal.currentValue?.replace(/[^\d.]/g, '') || '0');
    const target = parseFloat(goal.targetValue?.replace(/[^\d.]/g, '') || '0');
    
    if (target > 0) {
      return Math.min(100, Math.round((current / target) * 100));
    }
    return 0;
  };

  // Helper function to filter and sort action items
  const getFilteredAndSortedActionItems = () => {
    let filtered = actionItems;

    // Apply filters
    if (actionItemFilter !== 'ALL') {
      if (actionItemFilter === 'OVERDUE') {
        filtered = actionItems.filter(item => {
          if (!item.dueDate || item.status === 'COMPLETED') return false;
          return new Date(item.dueDate) < new Date();
        });
      } else {
        filtered = actionItems.filter(item => item.status === actionItemFilter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortActionItemsBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        case 'status':
          const statusOrder = { 'OVERDUE': 0, 'IN_PROGRESS': 1, 'PENDING': 2, 'COMPLETED': 3 };
          const aStatus = (a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'COMPLETED') ? 'OVERDUE' : a.status;
          const bStatus = (b.dueDate && new Date(b.dueDate) < new Date() && b.status !== 'COMPLETED') ? 'OVERDUE' : b.status;
          return statusOrder[aStatus as keyof typeof statusOrder] - statusOrder[bStatus as keyof typeof statusOrder];
        case 'created':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return filtered;
  };

  // Helper function to get action item status including overdue
  const getActionItemStatus = (item: ActionItem) => {
    if (item.status === 'COMPLETED') return 'COMPLETED';
    if (item.dueDate && new Date(item.dueDate) < new Date()) return 'OVERDUE';
    return item.status;
  };

  // Helper function to get days until due date
  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Timer functionality - manual control
  const startSession = async () => {
    if (!isSessionActive) {
      let sessionToUse = currentSession;
      
      // First, create a session if one doesn't exist
      if (!sessionToUse) {
        sessionToUse = await createCurrentSession();
        if (!sessionToUse) {
          console.error('Failed to create session');
          return;
        }
        // Use the newly created session to start
        setCurrentSession(sessionToUse);
      }
      
      setIsSessionActive(true);
      setIsSessionPaused(false);
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      
      // Update session status to ACTIVE
      try {
        await fetch(`/api/session/${sessionToUse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' })
        });
        console.log('Session started successfully');
        // Refresh sessions list to remove current session from previous sessions
        await refreshSessions();
      } catch (error) {
        console.error('Error updating session status:', error);
      }
      
      // Start timer from current elapsed time
      const interval = setInterval(() => {
        setElapsedTime(prev => {
          const newElapsed = prev + 1;
          const mins = Math.floor(newElapsed / 60);
          const secs = newElapsed % 60;
          setTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          return newElapsed;
        });
      }, 1000);
      
      setTimerInterval(interval);
    }
  };

  const pauseSession = async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsSessionPaused(true);
    // Keep isSessionActive true so we don't show "Start Session" button
    
    // Update session status to PAUSED
    if (currentSession) {
      try {
        await fetch(`/api/session/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED' })
        });
        console.log('Session paused');
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }
  };

  const resumeSession = async () => {
    if (!timerInterval && isSessionActive) {
      setIsSessionPaused(false);
      
      // Restart timer from current elapsed time
      const interval = setInterval(() => {
        setElapsedTime(prev => {
          const newElapsed = prev + 1;
          const mins = Math.floor(newElapsed / 60);
          const secs = newElapsed % 60;
          setTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          return newElapsed;
        });
      }, 1000);
      
      setTimerInterval(interval);
      
      // Update session status to ACTIVE
      if (currentSession) {
        try {
          await fetch(`/api/session/${currentSession.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACTIVE' })
          });
          console.log('Session resumed');
        } catch (error) {
          console.error('Error updating session status:', error);
        }
      }
    }
  };

  const stopSession = async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsSessionActive(false);
    setIsSessionPaused(false);
    setTimer("00:00");
    setSessionStartTime(null);
    setElapsedTime(0); // Reset elapsed time
    
    // Update session status to DRAFT (stopped but not completed)
    if (currentSession) {
      try {
        await fetch(`/api/session/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'DRAFT' })
        });
        console.log('Session stopped');
        // Refresh sessions list to show stopped session in previous sessions
        await refreshSessions();
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Load initial data
  useEffect(() => {
    if (session) {
      const loadInitialData = async () => {
        try {
          setIsLoading(true);
          // Load sessions, action items, goals, and agents
          const [sessionsRes, actionItemsRes, goalsRes, usersRes] = await Promise.all([
            fetch('/api/session'),
            fetch('/api/action-item'),
            fetch('/api/goal'),
            fetch('/api/user')
          ]);
          const sessions = await sessionsRes.json();
          const actionItemsData = await actionItemsRes.json();
          const goalsData = await goalsRes.json();
          const usersData = await usersRes.json();
          
          // Show all sessions (completed, draft, etc.) sorted by most recent first
          const allSessions = sessions
            .filter((s: Session) => s.status !== 'ACTIVE' && s.status !== 'PAUSED') // Don't show currently active sessions
            .sort((a: Session, b: Session) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
          
          setPreviousSessions(allSessions);
          setActionItems(actionItemsData);
          setGoals(goalsData);
          // Only show agents for selection
        setAgents(usersData.filter((u: User) => u.role === 'AGENT'));
        } catch (error) {
          console.error('Error loading initial data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadInitialData();
    }
  }, [session]);

  // Fetch agent metrics when selected agent changes
  useEffect(() => {
    if (selectedAgentId && (session?.user?.role === 'TEAM_LEADER' || session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN')) {
      fetchAgentMetrics(selectedAgentId);
    }
  }, [selectedAgentId, session?.user?.role]);

  // Widget drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setWidgetPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!session) {
    return null;
  }

  const createCurrentSession = async () => {
    if (isCreatingSession) {
      console.log('Session creation already in progress');
      return null;
    }
    
    setIsCreatingSession(true);
    try {
      if (!session?.user?.email) {
        console.error('User not authenticated');
        return null;
      }

      // Find the current user by email
      const usersResponse = await fetch('/api/user');
      const users = await usersResponse.json();
      
      const currentUser = users.find((user: User) => user.email === session.user.email);
      
      if (!currentUser) {
        console.error('Current user not found in database');
        return null;
      }

      // Generate session number - simple incremental approach
      const sessionsResponse = await fetch('/api/session');
      const existingSessions = await sessionsResponse.json();
      const userSessions = existingSessions.filter((s: Session) => s.teamLeaderId === currentUser.id);
      const sessionNumber = userSessions.length + 1;

      // Create a new session with the current user
      // For coaching sessions, the current user can be both team leader and agent
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionNumber,
          type: 'SCHEDULED',
          status: 'DRAFT',
          scheduledDate: new Date().toISOString(),
          teamLeaderId: currentUser.id,
          agentId: currentUser.id  // Self-coaching session
        })
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setCurrentSession(newSession);
        console.log('Session created:', newSession);
        // Refresh sessions list to remove new session from previous sessions
        await refreshSessions();
        return newSession; // Return the created session instead of calling startSession
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreatingSession(false);
    }
    return null;
  };

  const addQuickNote = async (note: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const noteWithTimestamp = `[${timestamp}] ${note}\n`;
    setNotes(prev => prev + noteWithTimestamp);
    
    // Save note to database
    if (currentSession) {
      try {
        await fetch('/api/session-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            content: note,
            isQuickNote: true,
            category: 'COACHING_NOTE'
          })
        });
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  const handleActionItemClick = async (item: ActionItem) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date';
    const completedDate = item.completedDate ? new Date(item.completedDate).toLocaleDateString() : 'Not completed';
    
    const detailedNote = `[${timestamp}] ACTION ITEM REVIEWED:
Title: ${item.title}
Description: ${item.description || 'No description'}
Status: ${item.status}
Priority: ${item.priority}
Due Date: ${dueDate}
${item.status === 'COMPLETED' ? `Completed: ${completedDate}` : ''}
Assigned to: ${item.assignedTo?.firstName} ${item.assignedTo?.lastName}
Created by: ${item.createdBy?.firstName} ${item.createdBy?.lastName}
---
`;
    
    setNotes(prev => prev + detailedNote);
    
    // Save note to database
    if (currentSession) {
      try {
        await fetch('/api/session-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            content: detailedNote,
            isQuickNote: true,
            category: 'ACTION_ITEM_REVIEW'
          })
        });
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  const updateActionItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/action-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          ...(newStatus === 'COMPLETED' ? { completedDate: new Date().toISOString() } : {})
        })
      });
      
      if (response.ok) {
        // Reload action items
        const actionItemsResponse = await fetch('/api/action-item');
        const actionItemsData = await actionItemsResponse.json();
        setActionItems(actionItemsData);
        
        await addQuickNote(`Action item "${actionItems.find(item => item.id === itemId)?.title}" status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const deleteActionItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this action item?')) {
      try {
        const response = await fetch(`/api/action-item/${itemId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Reload action items
          const actionItemsResponse = await fetch('/api/action-item');
          const actionItemsData = await actionItemsResponse.json();
          setActionItems(actionItemsData);
          
          await addQuickNote(`Action item deleted`);
        }
      } catch (error) {
        console.error('Error deleting action item:', error);
      }
    }
  };

  const saveSessionNotes = async () => {
    if (currentSession && notes) {
      try {
        setIsSaving(true);
        await fetch('/api/session-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            content: notes,
            isQuickNote: false,
            category: 'SESSION_SUMMARY'
          })
        });
        
        // Log the activity
        await logActivity('create', 'session_note', currentSession.id, {
          noteLength: notes.length,
          isQuickNote: false,
          category: 'SESSION_SUMMARY'
        });
      } catch (error) {
        console.error('Error saving session notes:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Helper function to log activities (visible only to admins)
  const logActivity = async (action: string, entityType: string, entityId: string, changes?: Record<string, unknown>) => {
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entityType,
          entityId,
          changes
        })
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleAgentResponse = async (response: string) => {
    setAgentResponse(response);
    
    // Log the agent response to audit log (admin only)
    if (currentSession) {
      await logActivity('agent_response', 'session', currentSession.id, {
        responseType: response,
        message: response === 'agree' 
          ? 'Agent agrees with the coaching feedback'
          : 'Agent disagrees with some aspects of the feedback'
      });
    }
    
    // Save agent response to database (but don't add to session notes)
    if (currentSession) {
      try {
        await fetch(`/api/session/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentResponseType: response.toUpperCase()
          })
        });
      } catch (error) {
        console.error('Error saving agent response:', error);
      }
    }
  };

  const createActionItem = async (title: string, description: string = '', priority: string = 'MEDIUM', dueDate: string = '', assignedToId: string = '') => {
    try {
      // Get users for default assignment
      const usersResponse = await fetch('/api/user');
      const users = await usersResponse.json();
      
      const teamLeader = users.find((user: User) => user.role === 'TEAM_LEADER');
      const agent = users.find((user: User) => user.role === 'AGENT');
      
      if (!teamLeader) {
        alert('Error: Team leader not found. Please contact admin.');
        return;
      }

      // Use provided assignedToId or default to agent or selected agent
      let finalAssignedToId = assignedToId;
      if (!finalAssignedToId) {
        if (selectedAgentId) {
          finalAssignedToId = selectedAgentId;
        } else if (agent) {
          finalAssignedToId = agent.id;
        } else {
          alert('Error: No agent available for assignment. Please contact admin.');
          return;
        }
      }

      // Calculate due date if not provided
      let finalDueDate = dueDate;
      if (!finalDueDate) {
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 7); // 7 days from now
        finalDueDate = defaultDue.toISOString();
      }

      const response = await fetch('/api/action-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          sessionId: currentSession?.id || null, // Can be null for general action items
          createdById: teamLeader.id,
          assignedToId: finalAssignedToId,
          priority: priority,
          status: 'PENDING',
          dueDate: finalDueDate
        })
      });
      
      if (response.ok) {
        const newActionItem = await response.json();
        setActionItems(prev => [...prev, newActionItem]);
        await addQuickNote(`New action item created: ${title}`);
        
        // Show success feedback
        alert(`Action item "${title}" created successfully!`);
      } else {
        const errorData = await response.json();
        console.error('Error creating action item:', errorData);
        alert('Error creating action item. Please try again.');
      }
    } catch (error) {
      console.error('Error creating action item:', error);
      alert('Error creating action item. Please check your connection and try again.');
    }
  };

  const handleCreateActionItem = async () => {
    if (!newActionItem.title.trim()) {
      alert('Please enter a title for the action item.');
      return;
    }
    
    await createActionItem(
      newActionItem.title, 
      newActionItem.description, 
      newActionItem.priority, 
      newActionItem.dueDate, 
      newActionItem.assignedToId
    );
    setNewActionItem({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' });
    setShowActionItemForm(false);
  };

  const completeSession = async () => {
    if (!currentSession) {
      alert('No active session to complete!');
      return;
    }

    try {
      setIsSaving(true);
      
      // Save final notes first
      if (notes.trim()) {
        await saveSessionNotes();
      }
      
      // Calculate duration properly
      const timeParts = timer.split(':');
      const minutes = parseInt(timeParts[0]) || 0;
      const seconds = parseInt(timeParts[1]) || 0;
      const totalMinutes = minutes + (seconds / 60);
      
      // Update session status to completed
      const updateResponse = await fetch(`/api/session/${currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          actualDate: new Date().toISOString(),
          duration: Math.round(totalMinutes)
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update session status');
      }
      
      // Add completion note
      await addQuickNote('Session completed successfully');
      
      // Stop the timer
      await stopSession();
      
      // Clear current session since it's now completed
      setCurrentSession(null);
      setNotes(''); // Clear notes for next session
      setRatings({}); // Clear ratings for next session
      
      // Refresh data to show completed session in previous sessions
      const loadInitialData = async () => {
        try {
          const [sessionsRes, goalsRes, actionItemsRes] = await Promise.all([
            fetch('/api/session'),
            fetch('/api/goal'),
            fetch('/api/action-item')
          ]);
          
          const [sessionsData, goalsData, actionItemsData] = await Promise.all([
            sessionsRes.json(),
            goalsRes.json(),
            actionItemsRes.json()
          ]);
          
          // Show all sessions (completed, draft, etc.) sorted by most recent first
          const allSessions = sessionsData
            .filter((s: Session) => s.status !== 'ACTIVE' && s.status !== 'PAUSED') // Don't show currently active sessions
            .sort((a: Session, b: Session) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
          
          setPreviousSessions(allSessions);
          setGoals(goalsData);
          setActionItems(actionItemsData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      
      await loadInitialData();
      
      alert('Session completed successfully!');
      
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to complete session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Previous session management functions
  const deletePreviousSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setPreviousSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // Log the activity
        await logActivity('delete', 'session', sessionId, {
          reason: 'User deleted previous session'
        });
        
        alert('Session deleted successfully');
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const viewPreviousSession = (session: Session) => {
    setSelectedPreviousSession(session);
    setShowSessionModal(true);
  };

  // Add missing tab switch handler
  const handleTabSwitch = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Add missing handleRating function for evaluation tab
  const handleRating = (criteria: string, rating: number) => {
    setRatings(prev => ({ ...prev, [criteria]: rating }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Minimalistic Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            
            {/* Left Section - SmartSource Brand */}
            <div className="flex items-center gap-6">
              {/* SmartSource Logo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* SmartSource Logo SVG */}
                  <svg width="40" height="40" viewBox="0 0 100 100" className="text-[#2B4C8C]">
                    {/* Main S Shape */}
                    <path 
                      d="M20 30 Q50 10, 80 30 Q50 50, 80 70 Q50 90, 20 70 Q50 50, 20 30 Z" 
                      fill="url(#smartsource-gradient)" 
                      stroke="none"
                    />
                    <defs>
                      <linearGradient id="smartsource-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4ECDC4" />
                        <stop offset="50%" stopColor="#2B4C8C" />
                        <stop offset="100%" stopColor="#4ECDC4" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-[#2B4C8C] tracking-tight">
                      SMART<span className="text-[#4ECDC4]">SOURCE</span>
                    </h1>
                    <span className="text-xs bg-[#4ECDC4] text-white px-2 py-0.5 rounded-full font-medium">
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Coaching Excellence Platform</p>
                </div>
              </div>

              {/* Session Status Indicator */}
              {currentSession && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className={`w-2 h-2 rounded-full ${
                    isSessionActive && !isSessionPaused ? 'bg-green-500 animate-pulse' :
                    isSessionPaused ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    Session #{currentSession.sessionNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {isSessionActive && !isSessionPaused ? 'Live' :
                     isSessionPaused ? 'Paused' :
                     'Ready'}
                  </span>
                </div>
              )}
            </div>

            {/* Center Section - User & Agent Info */}
            <div className="flex items-center gap-4">
              
              {/* Agent Selection for Supervisors */}
              {session?.user && (session.user.role === 'TEAM_LEADER' || session.user.role === 'ADMIN' || session.user.role === 'MANAGER') && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">Coaching:</span>
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    title="Select Agent to Coach"
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent hover:border-gray-400 transition-all"
                  >
                    <option value="">Select Agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current User Display */}
              {session?.user && (
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#4ECDC4] to-[#2B4C8C] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {session.user.firstName?.[0] || session.user.name?.[0]}{session.user.lastName?.[0] || session.user.name?.split(' ')[1]?.[0]}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                      {session.user.name || `${session.user.firstName} ${session.user.lastName}`}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {session.user.role?.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section - Timer & Controls */}
            <div className="flex items-center gap-4">
              
              {/* Timer Display */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Timer</span>
                  <div className="text-lg font-bold text-gray-800 font-mono">
                    {timer}
                  </div>
                </div>
              </div>
              
              {/* Session Controls */}
              <div className="flex items-center gap-2">
                {!isSessionActive ? (
                  <button
                    onClick={startSession}
                    className="flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#3ABCB5] text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Start
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {isSessionPaused ? (
                      <button
                        onClick={resumeSession}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseSession}
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopSession}
                      className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z"/>
                      </svg>
                      Stop
                    </button>
                  </div>
                )}
              </div>

              {/* Action Menu */}
              <div className="flex items-center gap-2">
                {/* Admin Panel Button */}
                {session?.user?.role === 'ADMIN' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#2B4C8C] px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                    title="Admin Panel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin
                  </button>
                )}

                {/* Settings Button */}
                <button
                  onClick={() => router.push('/settings')}
                  className="text-gray-600 hover:text-[#2B4C8C] p-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-red-600 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Live Session Widget - Modern compact widget for team leaders */}
      {currentSession && isSessionActive && (
        <div 
          className="fixed z-40 select-none"
          style={{
            left: `${widgetPosition.x}px`,
            top: `${widgetPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-72 backdrop-blur-sm">
            {/* Widget Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-ping absolute"></div>
                  <div className="w-3 h-3 bg-red-500 rounded-full relative z-10"></div>
                </div>
                <h3 className="text-gray-800 font-semibold text-sm uppercase tracking-wide">Live Session</h3>
              </div>
              <div className="text-gray-800 font-bold text-lg">
                #{currentSession.sessionNumber}
              </div>
            </div>

            {/* Timer Display */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center border border-gray-100">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Duration</div>
              <div className="text-2xl font-bold text-gray-800 font-mono tracking-wider">
                {timer}
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Status</div>
                <div className={`text-sm font-semibold ${
                  currentSession.status === 'ACTIVE' ? 'text-green-600' :
                  currentSession.status === 'PAUSED' ? 'text-yellow-600' :
                  'text-gray-800'
                }`}>
                  {currentSession.status}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Type</div>
                <div className="text-gray-800 font-semibold text-sm">
                  {currentSession.type?.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Agent Info (if selected) */}
            {selectedAgentId && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Agent</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#4ECDC4] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {agents.find(a => a.id === selectedAgentId)?.firstName?.[0]}{agents.find(a => a.id === selectedAgentId)?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-800 font-semibold text-sm truncate">
                      {agents.find(a => a.id === selectedAgentId)?.firstName} {agents.find(a => a.id === selectedAgentId)?.lastName}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      {agents.find(a => a.id === selectedAgentId)?.email}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {isSessionPaused ? (
                <button
                  onClick={resumeSession}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
                >
                  ▶️ Resume
                </button>
              ) : (
                <button
                  onClick={pauseSession}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
                >
                  ⏸️ Pause
                </button>
              )}
              
              <button
                onClick={stopSession}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
              >
                ⏹️ Stop
              </button>
            </div>

            {/* Drag indicator */}
            <div className="flex justify-center mt-3">
              <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className="max-w-none mx-auto p-6 bg-gray-50 min-h-[calc(100vh-80px)]">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* Previous Sessions Column */}
          <div className="col-span-3 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#2B4C8C] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Previous Sessions
              </h3>
              <span className="bg-white text-gray-600 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 shadow-sm">{previousSessions.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Session Cards */}
              {previousSessions.map((session: Session, index: number) => (
                <div 
                  key={session.id}
                  className="w-full mb-3 bg-gradient-to-br from-white via-gray-50 to-blue-50 border border-[#00C4B3]/20 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-[#00C4B3]/40 transform hover:-translate-y-1" 
                  onClick={() => viewPreviousSession(session)}
                >
                  {/* Header with Session Number and Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#00C4B3] to-[#00B4A3] rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-sm">#{session.sessionNumber || index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-800 mb-1">
                          Coaching Session
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            session.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                            session.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                            session.status === 'PAUSED' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {session.status}
                          </span>
                          {session.type && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {session.type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Overall Score */}
                      {session.status === 'COMPLETED' && session.overallScore && (
                        <div className="bg-white rounded-md px-2 py-1 shadow-sm border text-center">
                          <div className="text-sm font-bold text-[#00C4B3]">{session.overallScore}</div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                      )}
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreviousSession(session.id);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-all"
                        title="Delete session"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M9 10v10a2 2 0 002 2h2a2 2 0 002-2V10M9 10H7a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white rounded-md p-2 text-center shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Duration</div>
                      <div className="text-sm font-bold text-gray-800">
                        {session.duration ? `${session.duration}m` : '--'}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-md p-2 text-center shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Actions</div>
                      <div className="text-sm font-bold text-blue-600">
                        {actionItems.filter(item => item.sessionId === session.id).length}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-md p-2 text-center shadow-sm border border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">Done</div>
                      <div className="text-sm font-bold text-green-600">
                        {actionItems.filter(item => item.sessionId === session.id && item.status === 'COMPLETED').length}
                      </div>
                    </div>
                  </div>

                  {/* Key Topics/Areas Covered */}
                  <div className="bg-white/70 rounded-md p-2 mb-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Focus Areas</div>
                    <div className="flex flex-wrap gap-1">
                      {/* Sample focus areas - in real implementation, these would come from session data */}
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Communication</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Problem Solving</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">Customer Focus</span>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  {session.status === 'COMPLETED' && (
                    <div className="bg-white/70 rounded-md p-2 mb-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Performance Ratings</div>
                      <div className="space-y-1">
                        {[
                          { label: 'Communication', score: 4 },
                          { label: 'Technical Skills', score: 3 },
                          { label: 'Customer Focus', score: 5 }
                        ].map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">{metric.label}</span>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= metric.score ? 'bg-[#00C4B3]' : 'bg-gray-200'}`}></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items Preview */}
                  {actionItems.filter(item => item.sessionId === session.id).slice(0, 2).length > 0 && (
                    <div className="bg-white/70 rounded-md p-2 mb-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Recent Action Items</div>
                      <div className="space-y-1">
                        {actionItems.filter(item => item.sessionId === session.id).slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'COMPLETED' ? 'bg-green-500' :
                              item.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}></div>
                            <span className="text-xs text-gray-700 flex-1 truncate">{item.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              item.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.status === 'COMPLETED' ? 'Done' : 
                               item.status === 'IN_PROGRESS' ? 'Progress' : 'Pending'}
                            </span>
                          </div>
                        ))}
                        {actionItems.filter(item => item.sessionId === session.id).length > 2 && (
                          <div className="text-xs text-gray-500 italic">
                            +{actionItems.filter(item => item.sessionId === session.id).length - 2} more items...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer with Date and Time */}
                  <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-200 pt-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(session.scheduledDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      Click to view
                    </span>
                  </div>
                </div>
              ))}
              
              {previousSessions.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 py-8">
                  <p>No previous sessions found</p>
                </div>
              )}
              
              {isLoading && (
                <div className="text-center text-gray-500 py-8">
                  <p>Loading sessions...</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Session Area */}
          <div className="col-span-6 flex flex-col gap-4 h-full min-h-0">
            {/* Agent Header and Metrics for Team Leader, Admin, and Manager with agent selected */}
            {(session.user?.role === 'TEAM_LEADER' || session.user?.role === 'ADMIN' || session.user?.role === 'MANAGER') && selectedAgentId && (
              <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-6 flex-shrink-0">
                <div className="flex justify-between items-start">
                  {/* Agent Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {(() => {
                          const agent = agents.find(a => a.id === selectedAgentId);
                          if (!agent) return "";
                          return `${agent.firstName[0] || ''}${agent.lastName[0] || ''}`;
                        })()}
                      </div>
                      {/* Online status indicator */}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">
                        {(() => {
                          const agent = agents.find(a => a.id === selectedAgentId);
                          if (!agent) return "";
                          return `${agent.firstName} ${agent.lastName}`;
                        })()}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {(() => {
                            const agent = agents.find(a => a.id === selectedAgentId);
                            return agent?.department || 'Customer Service';
                          })()}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{(() => {
                          const agent = agents.find(a => a.id === selectedAgentId);
                          if (agent?.tenure) {
                            const tenure = new Date(agent.tenure);
                            const now = new Date();
                            const months = Math.floor((now.getTime() - tenure.getTime()) / (1000 * 60 * 60 * 24 * 30));
                            return `${Math.floor(months / 12)}y ${months % 12}m experience`;
                          }
                          return '2y 3m experience';
                        })()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="flex items-center gap-6">
                    {/* Overall Score Circle */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-gray-200"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            className="text-indigo-500"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${(agentMetrics?.overallScore || 85) * 100 / 100}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-900">
                            {isLoadingMetrics ? '...' : (agentMetrics?.overallScore || 85)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium mt-1">Overall</span>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* CSAT Score */}
                      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm min-w-[100px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">CSAT</span>
                          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-indigo-600">
                            {isLoadingMetrics ? '...' : agentMetrics?.metrics?.CSAT?.value || '4.8'}
                          </span>
                          <span className="text-xs text-gray-400">/5</span>
                        </div>
                      </div>

                      {/* FCR */}
                      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm min-w-[100px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">FCR</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-green-600">
                            {isLoadingMetrics ? '...' : agentMetrics?.metrics?.FCR?.value || '87'}
                          </span>
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </div>

                      {/* AHT */}
                      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm min-w-[100px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">AHT</span>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-blue-600">
                            {isLoadingMetrics ? '...' : (() => {
                              const aht = agentMetrics?.metrics?.AHT?.value;
                              if (aht) {
                                const mins = Math.floor(aht / 60);
                                const secs = aht % 60;
                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                              }
                              return '5:30';
                            })()}
                          </span>
                          <span className="text-xs text-gray-400">min</span>
                        </div>
                      </div>

                      {/* Quality Score */}
                      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm min-w-[100px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">Quality</span>
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-purple-600">
                            {isLoadingMetrics ? '...' : agentMetrics?.metrics?.['Quality Score']?.value || '92'}
                          </span>
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Trend Indicator */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1 text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">+3.2%</span>
                      </div>
                      <span className="text-xs text-gray-500">vs last month</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session Content */}
            <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-0 border border-gray-100">
              {/* Tabs */}
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                {[
                  { id: 'notes', label: 'Session Notes', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN'] },
                  { id: 'evaluation', label: 'Evaluation', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN'] },
                  { id: 'goals', label: 'Goals & Actions', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN', 'AGENT'] },
                  { id: 'templates', label: 'Templates', roles: ['TEAM_LEADER', 'MANAGER', 'ADMIN'] }
                ].filter(tab => tab.roles.includes(session.user?.role || '')).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id)}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'text-[#2B4C8C] border-[#4ECDC4] bg-white' 
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                {activeTab === 'notes' && (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 mb-4">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full h-full min-h-[200px] p-4 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                        placeholder="Enter your coaching notes here. Be specific about behaviors observed, feedback provided, and agent responses..."
                      />
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Quick Add Notes:</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'Great active listening',
                          'Needs work on empathy', 
                          'Excellent product knowledge',
                          'Good problem solving'
                        ].map(note => (
                          <button
                            key={note}
                            onClick={() => addQuickNote(note)}
                            className="px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'evaluation' && (
                  <div className="space-y-4">
                    {[
                      'Communication Skills',
                      'Technical Knowledge', 
                      'Problem Solving',
                      'Customer Focus',
                      'Process Compliance'
                    ].map(criteria => (
                      <div key={criteria} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium text-gray-700 text-base">{criteria}</span>
                          <p className="text-sm text-gray-500 mt-1">Rate this aspect of the agent&apos;s performance</p>
                        </div>
                        <div className="rating-stars ml-4">
                          {[1,2,3,4,5].map(rating => (
                            <svg
                              key={rating}
                              onClick={() => handleRating(criteria, rating)}
                              className={`star ${ratings[criteria] >= rating ? 'filled' : ''}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-4 text-gray-800">Current Goals</h4>
                      {goals.length > 0 ? (
                        goals.slice(0, 3).map((goal: Goal) => (
                          <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-3">
                            <h5 className="font-semibold text-sm mb-2 text-gray-800">{goal.title}</h5>
                            <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-medium text-gray-800">{calculateProgress(goal)}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full">
                                <div 
                                  className={`h-full bg-indigo-600 rounded-full transition-all duration-300 progress-bar-${Math.round(calculateProgress(goal) / 10) * 10}`}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h5 className="font-semibold text-sm mb-2 text-gray-800">Improve First Call Resolution</h5>
                          <p className="text-sm text-gray-600 mb-3">Target: Achieve 85% FCR by end of quarter</p>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium text-gray-800">78%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div className="h-full w-3/4 bg-indigo-600 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-4 text-gray-800">Action Items</h4>
                      <button 
                        onClick={() => createActionItem('New action item', 'Created from main session')}
                        className="w-full p-4 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add new action item
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'templates' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Performance Review', desc: 'Comprehensive performance evaluation template' },
                      { name: 'Skills Development', desc: 'Focus on skill improvement and training needs' },
                      { name: 'Incident Review', desc: 'Review specific customer incidents or complaints' },
                      { name: 'Goal Setting', desc: 'Set and track performance goals' }
                    ].map(template => (
                      <button
                        key={template.name}
                        onClick={() => addQuickNote(`Used ${template.name} template`)}
                        className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                      >
                        <h4 className="font-semibold text-sm mb-2 text-gray-800 group-hover:text-indigo-700">{template.name}</h4>
                        <p className="text-sm text-gray-600 group-hover:text-indigo-600">{template.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Agent Response:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAgentResponse('agree')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        agentResponse === 'agree' 
                          ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                          : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Agrees
                    </button>
                    <button
                      onClick={() => handleAgentResponse('disagree')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        agentResponse === 'disagree' 
                          ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                          : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Disagrees
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={saveSessionNotes}
                    disabled={isSaving}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button 
                    onClick={completeSession}
                    disabled={isSaving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Completing...' : 'Complete Session'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Action Items Column */}
          <div className="col-span-3 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full border border-gray-100">
            {/* Header with filters and controls */}
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#4ECDC4] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  Action Items
                </h3>
                <span className="bg-white text-gray-600 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 shadow-sm">
                  {actionItems.length}
                </span>
              </div>
              
              {/* Status Overview */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center bg-yellow-50 rounded-lg p-3 border border-yellow-200/50">
                  <div className="text-lg font-bold text-yellow-600">
                    {actionItems.filter(item => item.status === 'PENDING').length}
                  </div>
                  <div className="text-xs font-medium text-yellow-700">Pending</div>
                </div>
                <div className="text-center bg-blue-50 rounded-lg p-3 border border-blue-200/50">
                  <div className="text-lg font-bold text-blue-600">
                    {actionItems.filter(item => item.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="text-xs font-medium text-blue-700">Active</div>
                </div>
                <div className="text-center bg-red-50 rounded-lg p-2 border border-red-200">
                  <div className="text-lg font-bold text-red-600">
                    {actionItems.filter(item => {
                      if (!item.dueDate || item.status === 'COMPLETED') return false;
                      return new Date(item.dueDate) < new Date();
                    }).length}
                  </div>
                  <div className="text-xs font-medium text-red-700">Overdue</div>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-2 border border-green-200">
                  <div className="text-lg font-bold text-green-600">
                    {actionItems.filter(item => item.status === 'COMPLETED').length}
                  </div>
                  <div className="text-xs font-medium text-green-700">Done</div>
                </div>
              </div>

              {/* Filters and Sort */}
              <div className="flex gap-2">
                <select
                  value={actionItemFilter}
                  onChange={(e) => setActionItemFilter(e.target.value as 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE')}
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                  title="Filter action items"
                >
                  <option value="ALL">All Items</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <select
                  value={sortActionItemsBy}
                  onChange={(e) => setSortActionItemsBy(e.target.value as 'dueDate' | 'priority' | 'status' | 'created')}
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                  title="Sort action items"
                >
                  <option value="dueDate">By Due Date</option>
                  <option value="priority">By Priority</option>
                  <option value="status">By Status</option>
                  <option value="created">By Created</option>
                </select>
              </div>
            </div>

            {/* Action Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              {getFilteredAndSortedActionItems().map((item: ActionItem) => {
                const status = getActionItemStatus(item);
                const daysUntilDue = item.dueDate ? getDaysUntilDue(item.dueDate) : null;
                
                return (
                  <div key={item.id} className="mb-3 bg-gradient-to-br from-white via-gray-50 to-blue-50 border rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm text-gray-800 flex-1 mr-2">{item.title}</h4>
                      <div className="flex items-center gap-1">
                        {/* Priority Indicator */}
                        <div className={`w-2 h-2 rounded-full ${
                          item.priority === 'HIGH' ? 'bg-red-500' :
                          item.priority === 'MEDIUM' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} title={`${item.priority} Priority`}></div>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {status === 'PENDING' ? 'Pending' : 
                           status === 'COMPLETED' ? 'Done' :
                           status === 'IN_PROGRESS' ? 'Active' :
                           status === 'OVERDUE' ? 'Overdue' : status}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-white/70 rounded-md p-2 border border-gray-200">
                        <div className="text-gray-500 font-medium mb-1">Due Date</div>
                        <div className="font-semibold text-gray-800">
                          {item.dueDate ? (
                            <span className={daysUntilDue !== null && daysUntilDue < 0 ? 'text-red-600' : daysUntilDue !== null && daysUntilDue <= 2 ? 'text-yellow-600' : 'text-gray-800'}>
                              {new Date(item.dueDate).toLocaleDateString()}
                              {daysUntilDue !== null && (
                                <span className="block text-xs">
                                  {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                                   daysUntilDue === 0 ? 'Due today' :
                                   daysUntilDue === 1 ? 'Due tomorrow' :
                                   `${daysUntilDue} days left`}
                                </span>
                              )}
                            </span>
                          ) : 'No due date'}
                        </div>
                      </div>
                      
                      <div className="bg-white/70 rounded-md p-2 border border-gray-200">
                        <div className="text-gray-500 font-medium mb-1">Assigned To</div>
                        <div className="font-semibold text-gray-800">
                          {item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : 'Unassigned'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for In Progress Items */}
                    {item.status === 'IN_PROGRESS' && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-600">Progress</span>
                          <span className="text-xs font-bold text-blue-600">In Progress</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/5"></div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleActionItemClick(item)}
                        className="flex-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors font-medium"
                        title="Review Details"
                      >
                        📝 Review
                      </button>
                      
                      {item.status === 'PENDING' && (
                        <button
                          onClick={() => updateActionItemStatus(item.id, 'IN_PROGRESS')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium"
                          title="Start Working"
                        >
                          🚀 Start
                        </button>
                      )}
                      
                      {item.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => updateActionItemStatus(item.id, 'COMPLETED')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors font-medium"
                          title="Mark Complete"
                        >
                          ✓ Done
                        </button>
                      )}
                      
                      {item.status === 'PENDING' && (
                        <button
                          onClick={() => updateActionItemStatus(item.id, 'COMPLETED')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors font-medium"
                          title="Mark Complete"
                        >
                          ✓ Complete
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteActionItem(item.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium"
                        title="Delete Item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty State with Sample Actions */}
              {getFilteredAndSortedActionItems().length === 0 && actionItems.length === 0 && !isLoading && (
                <div className="space-y-3">
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">No action items yet</p>
                    <p className="text-xs text-gray-400">Create action items to track progress</p>
                  </div>

                  {/* Sample Action Items */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm text-gray-800">Complete empathy training</h4>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">High Priority</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Enroll in advanced customer empathy course</p>
                    <div className="flex gap-2 text-xs text-gray-500 mb-3">
                      <span>Due: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                      <span>• Assigned to Agent</span>
                    </div>
                    <button 
                      onClick={() => createActionItem('Complete empathy training', 'Enroll in advanced customer empathy course', 'HIGH')}
                      className="w-full px-3 py-2 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors font-medium"
                    >
                      ➕ Create This Action Item
                    </button>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm text-gray-800">Shadow senior agent</h4>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Medium Priority</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">2 hours with senior agent on complex calls</p>
                    <div className="flex gap-2 text-xs text-gray-500 mb-3">
                      <span>Due: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                      <span>• Assigned to Agent</span>
                    </div>
                    <button 
                      onClick={() => createActionItem('Shadow senior agent', '2 hours with senior agent on complex calls', 'MEDIUM')}
                      className="w-full px-3 py-2 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors font-medium"
                    >
                      ➕ Create This Action Item
                    </button>
                  </div>
                </div>
              )}

              {/* No Results for Filter */}
              {getFilteredAndSortedActionItems().length === 0 && actionItems.length > 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">No action items match the current filter</p>
                  <button 
                    onClick={() => setActionItemFilter('ALL')}
                    className="mt-2 text-xs text-[#00C4B3] hover:underline"
                  >
                    Show all items
                  </button>
                </div>
              )}

              {/* Enhanced Add Action Item Form */}
              {showActionItemForm ? (
                <div className="border-2 border-[#00C4B3] rounded-xl p-4 mt-4 bg-gradient-to-br from-[#00C4B3]/5 to-blue-50">
                  <h5 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Action Item
                  </h5>
                  
                  {/* Title */}
                  <input
                    type="text"
                    placeholder="Action item title..."
                    value={newActionItem.title}
                    onChange={(e) => setNewActionItem(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                  />
                  
                  {/* Description */}
                  <textarea
                    placeholder="Description (optional)..."
                    value={newActionItem.description}
                    onChange={(e) => setNewActionItem(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg mb-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                    rows={3}
                  />
                  
                  {/* Priority and Due Date */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={newActionItem.priority}
                        onChange={(e) => setNewActionItem(prev => ({ ...prev, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                        title="Select priority level"
                      >
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newActionItem.dueDate ? new Date(newActionItem.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setNewActionItem(prev => ({ ...prev, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                        min={new Date().toISOString().split('T')[0]}
                        title="Select due date"
                      />
                    </div>
                  </div>
                  
                  {/* Assign to */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Assign to</label>
                    <select
                      value={newActionItem.assignedToId}
                      onChange={(e) => setNewActionItem(prev => ({ ...prev, assignedToId: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B3] focus:border-transparent"
                      title="Assign to user"
                    >
                      <option value="">Auto-assign (Selected Agent or Default)</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName} ({agent.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateActionItem}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00C4B3] to-[#00B4A3] text-white rounded-lg hover:from-[#00B4A3] hover:to-[#00A393] transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                    >
                      ✓ Create Action Item
                    </button>
                    <button
                      onClick={() => {
                        setShowActionItemForm(false);
                        setNewActionItem({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowActionItemForm(true)}
                  className="w-full p-4 border-2 border-dashed border-[#00C4B3] rounded-xl text-[#00C4B3] hover:bg-[#00C4B3]/5 hover:border-[#00C4B3] transition-all flex items-center justify-center gap-2 mt-4 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Action Item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Previous Session Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                title="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-gray-500 mb-4">March 5, 2024 • 32 minutes</p>
              <h4 className="font-semibold mb-4">Focus: Call handling efficiency</h4>
              <p className="text-gray-700 leading-relaxed mb-6">
                Michael showed significant improvement in call handling. Average handle time reduced by 15%. 
                Still needs to work on maintaining quality while improving speed.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-green-600 mb-2">Strengths</h5>
                  <ul className="space-y-1">
                    <li>✓ Time management</li>
                    <li>✓ System navigation</li>
                    <li>✓ Customer rapport</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-amber-600 mb-2">Areas for Improvement</h5>
                  <ul className="space-y-1">
                    <li>• Active listening</li>
                    <li>• Closing techniques</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Session Detail Modal */}
      {showSessionModal && selectedPreviousSession && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00C4B3] to-[#00B4A3] px-4 py-3 text-white relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold">#{selectedPreviousSession.sessionNumber}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Session Details</h2>
                    <p className="text-white/80 text-xs">
                      {new Date(selectedPreviousSession.scheduledDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
                  title="Close modal"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 text-center border border-blue-200">
                  <div className="text-lg font-bold text-blue-600 mb-1">
                    {selectedPreviousSession.duration || '--'}
                  </div>
                  <div className="text-xs font-medium text-blue-700">Duration (min)</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 text-center border border-green-200">
                  <div className="text-lg font-bold text-green-600 mb-1">
                    {selectedPreviousSession.overallScore || '--'}
                  </div>
                  <div className="text-xs font-medium text-green-700">Score</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 text-center border border-purple-200">
                  <div className="text-lg font-bold text-purple-600 mb-1">
                    {actionItems.filter(item => item.sessionId === selectedPreviousSession.id).length}
                  </div>
                  <div className="text-xs font-medium text-purple-700">Actions</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 text-center border border-orange-200">
                  <div className="text-lg font-bold text-orange-600 mb-1">
                    {actionItems.filter(item => item.sessionId === selectedPreviousSession.id && item.status === 'COMPLETED').length}
                  </div>
                  <div className="text-xs font-medium text-orange-700">Done</div>
                </div>
              </div>

              {/* Session Info and Performance Side by Side */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Session Info</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedPreviousSession.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          selectedPreviousSession.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedPreviousSession.status}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-600">Type</label>
                      <p className="text-gray-900 text-sm mt-1">{selectedPreviousSession.type?.replace('_', ' ')}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-600">Time</label>
                      <p className="text-gray-900 text-sm mt-1">
                        {new Date(selectedPreviousSession.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Ratings */}
                {selectedPreviousSession.status === 'COMPLETED' && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Performance</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Communication', score: 4 },
                        { label: 'Technical', score: 3 },
                        { label: 'Problem Solving', score: 5 },
                        { label: 'Customer Focus', score: 4 }
                      ].map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{metric.label}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i <= metric.score ? 'bg-[#00C4B3]' : 'bg-gray-200'}`}></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Session Summary */}
              {selectedPreviousSession.summary && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Session Summary</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{selectedPreviousSession.summary}</p>
                </div>
              )}

              {/* Action Items */}
              {actionItems.filter(item => item.sessionId === selectedPreviousSession.id).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Action Items</h3>
                  <div className="space-y-2">
                    {actionItems.filter(item => item.sessionId === selectedPreviousSession.id).map((item, idx) => (
                      <div key={idx} className="bg-white rounded-md p-3 border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            item.status === 'COMPLETED' ? 'bg-green-500' :
                            item.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}></div>
                          <div>
                            <h4 className="font-medium text-gray-800 text-sm">{item.title}</h4>
                            {item.description && (
                              <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>Priority: {item.priority}</span>
                              {item.dueDate && (
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status === 'COMPLETED' ? 'Done' : 
                           item.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {/* Sample focus areas - in real implementation, these would come from session data */}
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Communication</span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Problem Solving</span>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">Customer Focus</span>
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">Technical Skills</span>
                  <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium">Process Compliance</span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => setShowSessionModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
                    deletePreviousSession(selectedPreviousSession.id);
                    setShowSessionModal(false);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-all"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
