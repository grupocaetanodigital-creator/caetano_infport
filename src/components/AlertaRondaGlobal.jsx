// Pasta: src/components/AlertaRondaGlobal.jsx
import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

export default function AlertaRondaGlobal({ onNavegarRondas }) {
  const [tempoRestante, setTempoRestante] = useState(0);
  const [alertaDisparado, setAlertaDisparado] = useState(false);

  useEffect(() => {
    const checarTimer = () => {
      const rondaAtiva = localStorage.getItem('infport_ronda_ativa');
      if (rondaAtiva === 'true') {
        setTempoRestante(0);
        setAlertaDisparado(false);
        return;
      }

      const ultimaRondaFim = localStorage.getItem('infport_ultima_ronda_fim');
      if (!ultimaRondaFim) {
        setTempoRestante(0);
        setAlertaDisparado(false);
        return;
      }

      const dataFim = new Date(ultimaRondaFim).getTime();
      const agora = new Date().getTime();
      const decorridoSegundos = Math.floor((agora - dataFim) / 1000);
      const limiteSegundos = 15 * 60; // 15 minutos
      const restante = limiteSegundos - decorridoSegundos;

      if (restante <= 0) {
        setTempoRestante(0);
        if (!alertaDisparado) {
          setAlertaDisparado(true);
          dispararAlertaSonoroContinuo();
        }
      } else {
        setTempoRestante(restante);
        setAlertaDisparado(false);
      }
    };

    checarTimer();
    const interval = setInterval(checarTimer, 1000);

    const handleRondaEvent = () => checarTimer();
    window.addEventListener('ronda_finalizada', handleRondaEvent);
    window.addEventListener('ronda_iniciada', handleRondaEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ronda_finalizada', handleRondaEvent);
      window.removeEventListener('ronda_iniciada', handleRondaEvent);
    };
  }, [alertaDisparado]);

  // Alerta sonoro usando Web Audio API nativa
  const dispararAlertaSonoroContinuo = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const emitirBeep = (freq, duracao) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duracao);
      };

      // Sequência de 3 beeps de alerta urgente
      emitirBeep(880, 0.2);
      setTimeout(() => emitirBeep(880, 0.2), 300);
      setTimeout(() => emitirBeep(1100, 0.4), 600);
    } catch (e) {
      console.log('Erro ao emitir áudio global:', e);
    }
  };

  const formatarTempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  if (!alertaDisparado && tempoRestante <= 0) return null;

  return (
    <>
      {/* BARRA FIXA SUPERIOR ENQUANTO O TEMPO ESTÁ CORRENDO */}
      {!alertaDisparado && tempoRestante > 0 && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between text-xs font-bold shadow-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 animate-spin" />
            <span>INTERVALO DE RONDA EM ANDAMENTO</span>
          </div>
          <div className="bg-slate-950 text-amber-400 font-mono px-3 py-0.5 rounded-lg text-sm">
            {formatarTempo(tempoRestante)}
          </div>
        </div>
      )}

      {/* POP-UP GLOBAL URGENTE QUANDO EXPIRAR OS 15 MINUTOS EM QUALQUER TELA */}
      {alertaDisparado && (
        <div className="fixed inset-0 bg-red-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-bounce-short">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-center space-y-5 shadow-2xl border-4 border-red-600">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
              <ShieldAlert className="w-12 h-12" />
            </div>

            <div>
              <span className="bg-red-100 text-red-800 text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                ALERTA DE SEGURANÇA PATRIMONIAL
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">HORA DE INICIAR A PRÓXIMA RONDA!</h2>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                Passaram-se <strong>15 minutos</strong> desde a conclusão da última ronda. Realize a varredura nos pontos cadastrados do condomínio.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center justify-center gap-2 text-red-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Ação obrigatória do vigia / portaria no plantão!</span>
            </div>

            <button
              onClick={() => {
                if (onNavegarRondas) onNavegarRondas();
                setAlertaDisparado(false);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl text-sm uppercase flex items-center justify-center gap-2 transition shadow-lg"
            >
              IR PARA TELA DE RONDAS E INICIAR <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
