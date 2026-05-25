"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Check, Clock } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex w-[320px] items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${type === "success" ? "bg-success/90 text-success" : "bg-danger/90 text-danger"} animate-fade-in`}>
      {type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
      <div>
        <p className="font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-auto text-opacity-60 hover:text-opacity-100 transition-opacity p-1 rounded"
        aria-label="Close toast"
      >
        <Clock size={14} />
      </button>
    </div>
  );
}

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error";
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    // Optional: Add a global error handler for uncaught promise rejections
    // Not implemented here to keep it simple
  }, []);

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}
