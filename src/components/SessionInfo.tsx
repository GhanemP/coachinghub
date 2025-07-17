"use client";
import React from "react";
type Props = {
  coach?: string;
  client?: string;
  date?: string;
};

const SessionInfo: React.FC<Props> = ({
  coach = "Jane Doe",
  client = "John Smith",
  date = "July 15, 2025",
}) => (
  <div>
    <h3 className="font-semibold text-gray-700 mb-2">Session Info</h3>
    <div className="text-sm text-gray-500">Coach: {coach}</div>
    <div className="text-sm text-gray-500">Client: {client}</div>
    <div className="text-sm text-gray-500">Date: {date}</div>
  </div>
);

export default SessionInfo;
