import { useState, useCallback } from 'react';

interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const showNotification = useCallback((notification: Omit<NotificationState, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove after duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
    
    return id;
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message: string, options?: Partial<NotificationState>) => {
    return showNotification({ type: 'success', title, message, ...options });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, options?: Partial<NotificationState>) => {
    return showNotification({ type: 'error', title, message, ...options });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<NotificationState>) => {
    return showNotification({ type: 'warning', title, message, ...options });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<NotificationState>) => {
    return showNotification({ type: 'info', title, message, ...options });
  }, [showNotification]);

  return {
    notifications,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};
