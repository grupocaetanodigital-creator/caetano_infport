import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CheckCircle2 } from 'lucide-react';

export default function IndicadorConectividade() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [mostrarVoltou, setMostrarVoltou] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setMostrarVoltou(true);
      setTimeout(() => setMostrarVoltou(false), 4000);
    };

    const handleOffline = () => {
      setOnline(false);
      setMostrarVoltou(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !mostrarVoltou) return null;

  if (mostrarVoltou) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-emerald-600 text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200 border border-emerald-400/40">
        <CheckCircle2 className="w-4 h-4 text-white" />
        <span>Conexão restabelecida na portaria!</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-amber-600 text-white px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200 border border-amber-400/40">
      <span className="w-2 h-2 rounded-full bg-white animate-ping flex-shrink-0" />
      <WifiOff className="w-4 h-4 text-white flex-shrink-0" />
      <span>Modo Offline — O INFPORT continua operando com cache local.</span>
    </div>
  );
}
