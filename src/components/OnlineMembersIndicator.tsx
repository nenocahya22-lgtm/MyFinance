import React from "react";
import { Users, Wifi } from "lucide-react";

interface Props {
  onlineMembers: string[];
  currentUserId: string;
  isConnected: boolean;
}

export default function OnlineMembersIndicator({ onlineMembers, currentUserId, isConnected }: Props) {
  const others = onlineMembers.filter(id => id !== currentUserId);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex items-center gap-1 ${isConnected ? "text-emerald-600" : "text-slate-400"}`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
        <span>{isConnected ? "Realtime" : "Offline"}</span>
      </div>
      {others.length > 0 && (
        <div className="flex items-center gap-1 text-blue-600">
          <Users className="w-3 h-3" />
          <span>{others.length} online</span>
          <div className="flex -space-x-1">
            {others.slice(0, 3).map((uid) => (
              <div
                key={uid}
                title={uid}
                className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white font-bold"
                style={{ fontSize: "8px" }}
              >
                {uid.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
