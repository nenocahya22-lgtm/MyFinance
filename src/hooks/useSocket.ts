import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface SocketNotification {
  id: string;
  message: string;
  type: "transaction" | "account" | "bucket" | "debt" | "budget";
  action: "add" | "update" | "delete";
  fromUserId: string;
  timestamp: string;
}

export interface BudgetWarning {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  isOverspent: boolean;
  message: string;
}

interface UseSocketOptions {
  token: string | null;
  onDataSync?: (payload: any) => void;
  onNotification?: (notif: SocketNotification) => void;
  onBudgetWarning?: (warning: BudgetWarning) => void;
  onMemberOnline?: (userId: string) => void;
  onMemberOffline?: (userId: string) => void;
  onActivityLog?: (log: { userId: string; message: string; timestamp: string }) => void;
}

export function useSocket({
  token,
  onDataSync,
  onNotification,
  onBudgetWarning,
  onMemberOnline,
  onMemberOffline,
  onActivityLog
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;

    // Koneksi ke Socket.IO server
    const socket = io(window.location.origin, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[Socket] ✅ Terhubung realtime");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[Socket] 🔌 Koneksi terputus");
    });

    socket.on("data:sync", (payload: any) => {
      onDataSync?.(payload);
    });

    socket.on("notification", (notif: SocketNotification) => {
      onNotification?.(notif);
    });

    socket.on("budget:warning", (warning: BudgetWarning) => {
      onBudgetWarning?.(warning);
    });

    socket.on("member:online", ({ userId, onlineCount }: any) => {
      setOnlineMembers(prev => [...new Set([...prev, userId])]);
      onMemberOnline?.(userId);
    });

    socket.on("member:offline", ({ userId }: any) => {
      setOnlineMembers(prev => prev.filter(id => id !== userId));
      onMemberOffline?.(userId);
    });

    socket.on("members:list", ({ online }: { online: string[] }) => {
      setOnlineMembers(online);
    });

    socket.on("activity:log", (log: any) => {
      onActivityLog?.(log);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Emit perubahan data ke semua anggota keluarga
  const emitDataChange = useCallback((
    type: "transaction" | "bucket" | "account" | "debt",
    action: "add" | "update" | "delete",
    data: any
  ) => {
    socketRef.current?.emit("data:change", {
      type, action, data,
      timestamp: new Date().toISOString()
    });
  }, []);

  const emitActivity = useCallback((message: string) => {
    socketRef.current?.emit("activity", message);
  }, []);

  return { isConnected, onlineMembers, emitDataChange, emitActivity };
}
