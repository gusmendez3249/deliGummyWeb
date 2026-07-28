import React, { createContext, useContext, useState, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

type AlertType = 'success' | 'warning' | 'error' | 'info';

interface AlertContextType {
  showAlert: (message: string, title?: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Mensaje del sistema');
  const [alertType, setAlertType] = useState<AlertType>('warning');

  const showAlert = (msg: string, t = 'Atención', type: AlertType = 'warning') => {
    setMessage(msg);
    setTitle(t);
    setAlertType(type);
    setIsOpen(true);
  };

  useEffect(() => {
    // Override native window.alert globally to intercept any alert() call
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      const isSuccess = msg.toLowerCase().includes('éxito') || 
                        msg.toLowerCase().includes('exito') || 
                        msg.toLowerCase().includes('correctamente') ||
                        msg.toLowerCase().includes('guardada');
      const isError = msg.toLowerCase().includes('error') || 
                      msg.toLowerCase().includes('falló') || 
                      msg.toLowerCase().includes('incorrecta');
      
      const type = isSuccess ? 'success' : (isError ? 'error' : 'warning');
      const title = isSuccess ? 'Éxito' : (isError ? 'Error' : 'Atención');
      showAlert(msg, title, type);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 text-green-600',
          icon: <CheckCircle size={20} />
        };
      case 'error':
        return {
          bg: 'bg-red-50 text-red-600',
          icon: <XCircle size={20} />
        };
      case 'info':
        return {
          bg: 'bg-blue-50 text-blue-600',
          icon: <Info size={20} />
        };
      case 'warning':
      default:
        return {
          bg: 'bg-amber-50 text-amber-600',
          icon: <AlertTriangle size={20} />
        };
    }
  };

  const styles = getAlertStyles(alertType);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title} size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full flex-shrink-0 ${styles.bg}`}>
              {styles.icon}
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
