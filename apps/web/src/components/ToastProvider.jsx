import React, { createContext, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const pushToast = ({
    message,
    type = "success",
    actionLabel,
    onAction,
    duration = 6000,
  }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [
      ...prev,
      { id, message, type, actionLabel, onAction, duration },
    ]);
    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    }
    return id;
  };

  return (
    <ToastContext.Provider value={{ pushToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? "?" : toast.type === "error" ? "!" : "i"}
            </div>
            <div className="toast-message">{toast.message}</div>
            {toast.actionLabel && (
              <button
                className="toast-action"
                type="button"
                onClick={() => {
                  if (toast.onAction) {
                    Promise.resolve(toast.onAction()).catch(() => undefined);
                  }
                  removeToast(toast.id);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              className="toast-close"
              type="button"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
            {toast.duration > 0 && (
              <div
                className={`toast-progress toast-progress-${toast.type}`}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
