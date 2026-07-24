import React, { createContext, useContext, useState, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface AlertContextType {
  showAlert: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Mensaje del sistema');

  const showAlert = (msg: string, t = 'Atención') => {
    setMessage(msg);
    setTitle(t);
    setIsOpen(true);
  };

  useEffect(() => {
    // Override native window.alert globally to intercept any alert() call
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      showAlert(msg);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title} size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-full flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm text-text-secondary pt-1 leading-relaxed">{message}</p>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover shadow-sm transition-colors font-medium"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}
