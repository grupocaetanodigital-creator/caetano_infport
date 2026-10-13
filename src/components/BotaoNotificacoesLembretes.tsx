import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, MessageSquare } from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  buscarLembretes,
  contarNaoLidos,
  reproduzirSinalSonoroAviso,
  LembretePortaria
} from '../services/lembretesService';

interface BotaoNotificacoesLembretesProps {
  condominioId: string;
  onAbrirPainel: () => void;
  className?: string;
}

export default function BotaoNotificacoesLembretes({
  condominioId,
  onAbrirPainel,
  className = ''
}: BotaoNotificacoesLembretesProps) {
  const [totalNaoLidos, setTotalNaoLidos] = useState<number>(0);
  const [carregando, setCarregando] = useState<boolean>(true);
  const ultimoTotalRef = useRef<number>(0);

  // Carrega e atualiza contagem de pendências
  const carregarContagem = async (tocarSomSeAumentou = false) => {
    if (!condominioId) {
      setTotalNaoLidos(0);
      setCarregando(false);
      return;
    }

    try {
      const { lembretes } = await buscarLembretes(condominioId);
      const naoLidos = contarNaoLidos(lembretes);

      // Se surgiram novas mensagens e a contagem aumentou, toca sinal sonoro
      if (tocarSomSeAumentou && naoLidos > ultimoTotalRef.current) {
        reproduzirSinalSonoroAviso();
      }

      ultimoTotalRef.current = naoLidos;
      setTotalNaoLidos(naoLidos);
    } catch {
      // Ignora erro transitório
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarContagem(false);

    // Escuta eventos locais disparados na própria janela (atualizações imediatas)
    const handleEventoLocal = (e: any) => {
      const detalheCondId = e.detail?.condominioId;
      if (!detalheCondId || detalheCondId === condominioId) {
        carregarContagem(false);
      }
    };
    window.addEventListener('lembretes_portaria_atualizados', handleEventoLocal);

    // Configura canal Realtime do Supabase para escuta instantânea entre dispositivos (Portaria ⇄ Moradores)
    const channelName = `realtime_lembretes_${condominioId || 'global'}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lembretes_portaria'
        },
        (payload) => {
          // Quando qualquer alteração acontecer na tabela
          const novoLembrete = payload.new as Partial<LembretePortaria> | null;
          // Se for do mesmo condomínio (ou se for novo e não lido)
          if (!novoLembrete || !novoLembrete.condominio_id || novoLembrete.condominio_id === condominioId) {
            carregarContagem(true);
          }
        }
      )
      .subscribe();

    // Polling de segurança a cada 20 segundos para garantir paridade
    const intervalo = setInterval(() => {
      carregarContagem(true);
    }, 20000);

    return () => {
      window.removeEventListener('lembretes_portaria_atualizados', handleEventoLocal);
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [condominioId]);

  const temPendencias = totalNaoLidos > 0;

  return (
    <button
      type="button"
      onClick={onAbrirPainel}
      title={
        temPendencias
          ? `${totalNaoLidos} recado(s) pendente(s) da portaria / moradores`
          : 'Lembretes e Recados da Portaria'
      }
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${
        temPendencias
          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/50 shadow-sm shadow-amber-500/20'
          : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700'
      } ${className}`}
      aria-label="Notificações e Lembretes da Portaria"
    >
      {/* Ícone com animação pulsante sutil quando há avisos pendentes */}
      {temPendencias ? (
        <span className="relative flex items-center justify-center">
          <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping opacity-75"></span>
          <BellRing className="w-5 h-5 text-amber-300 animate-pulse relative z-10" />
        </span>
      ) : (
        <Bell className="w-5 h-5 transition-transform group-hover:scale-105" />
      )}

      {/* Badge Numérico Dinâmico com Contador de Pendências */}
      {temPendencias && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-slate-900 animate-bounce leading-none"
          style={{ animationDuration: '2s' }}
        >
          {totalNaoLidos > 99 ? '99+' : totalNaoLidos}
        </span>
      )}
    </button>
  );
}
