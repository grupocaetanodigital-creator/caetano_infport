import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Repeat, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserCheck, 
  Lock, 
  MessageCircle, 
  FileCheck2, 
  ShieldCheck, 
  Clock, 
  User,
  CheckSquare,
  Square,
  Key,
  Radio,
  Wrench,
  Package,
  Box,
  Footprints,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export default function PassagemPosto({ usuarioLogado, onTrocarOperador }) {
  const [passagens, setPassagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Modal e Passos da Passagem de Posto
  const [modalNova, setModalNova] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [loginEntrante, setLoginEntrante] = useState('');
  const [senhaEntrante, setSenhaEntrante] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [divergencia, setDivergencia] = useState('');
  const [temDivergencia, setTemDivergencia] = useState(false);

  // Consolidação Automática Módulo por Módulo
  const [resumoPendencias, setResumoPendencias] = useState({
    chavesFora: 0,
    listaChaves: [],
    materiaisOk: true,
    qtdMateriais: 0,
    listaMateriaisAvariados: [],
    ocorrenciasAbertas: 0,
    listaOcorrencias: [],
    encomendasPendentes: 0,
    custodiasPendentes: 0,
    rondasUltimas12h: 0,
    ultimaRondaStatus: 'Não registrada'
  });

  // Checklist Manual da Guarita
  const [checklist, setChecklist] = useState({
    materiaisOk: true,
    chavesOk: true,
    encomendasOk: true,
    custodiaOk: true,
    limpezaOk: true,
    ocorrenciasCientes: true
  });

  useEffect(() => {
    carregarPassagens();
  }, []);

  const carregarPassagens = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('passagens_posto')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPassagens(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar histórico: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirNovaPassagem = async () => {
    setModalNova(true);
    setEtapa(1);
    setMensagem({ tipo: '', texto: '' });
    await varrerPendenciasModulos();
  };

  // Varredura de Pendências com os Filtros Solicitados
  const varrerPendenciasModulos = async () => {
    const condId = usuarioLogado?.condominio_id;
    if (!condId) return;

    try {
      // 1. Encomendas Retidas (Tabela: encomendas | status: retido)
      const { data: encomendas } = await supabase
        .from('encomendas')
        .select('*')
        .eq('condominio_id', condId);

      const encomendasRetidas = (encomendas || []).filter(e => 
        e.status && e.status.toLowerCase() === 'retido'
      );

      // 2. Custódias Aguardando Retirada (Tabela: custodias | status: Aguardando Retirada ou 'retido'/'pendente')
      const { data: custodias } = await supabase
        .from('custodias')
        .select('*')
        .eq('condominio_id', condId);

      const custodiasAguardando = (custodias || []).filter(c => {
        const st = (c.status || '').toLowerCase();
        return st === 'aguardando retirada' || st === 'retido' || st === 'pendente' || c.solicitacao_retirada === true;
      });

      // 3. Rondas Realizadas nas Últimas 12 Horas (Tabela: rondas)
      const dozeHorasAtras = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: rondas12h } = await supabase
        .from('rondas')
        .select('*')
        .eq('condominio_id', condId)
        .gte('created_at', dozeHorasAtras);

      const totalRondas12h = rondas12h ? rondas12h.length : 0;

      // Status da última ronda geral
      const { data: ultimaRondaData } = await supabase
        .from('rondas')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false })
        .limit(1);

      const ultimaRonda = ultimaRondaData && ultimaRondaData.length > 0 ? ultimaRondaData[0] : null;

      // 4. Chaves em Uso (Módulo 05)
      const { data: chaves } = await supabase
        .from('chaves')
        .select('*')
        .eq('condominio_id', condId);

      const chavesFora = (chaves || []).filter(c => 
        c.status && c.status.toLowerCase() !== 'disponivel'
      );

      // 5. Inventário/Materiais com Avaria (Módulo 04)
      const { data: materiais } = await supabase
        .from('materiais')
        .select('*')
        .eq('condominio_id', condId);

      const materiaisAvariados = (materiais || []).filter(m => 
        m.status && ['avaria', 'defeito', 'manutencao', 'danificado'].includes(m.status.toLowerCase())
      );

      // 6. Ocorrências / Chamados em Aberto (Módulos 06 e 08)
      const { data: ocorrencias } = await supabase
        .from('ocorrencias')
        .select('*')
        .eq('condominio_id', condId);

      const ocorrenciasAbertas = (ocorrencias || []).filter(o => 
        !o.status || !['concluido', 'resolvido', 'fechado', 'concluida'].includes(o.status.toLowerCase())
      );

      setResumoPendencias({
        chavesFora: chavesFora.length,
        listaChaves: chavesFora,
        materiaisOk: materiaisAvariados.length === 0,
        qtdMateriais: materiais?.length || 0,
        listaMateriaisAvariados: materiaisAvariados,
        ocorrenciasAbertas: ocorrenciasAbertas.length,
        listaOcorrencias: ocorrenciasAbertas,
        encomendasPendentes: encomendasRetidas.length,
        custodiasPendentes: custodiasAguardando.length,
        rondasUltimas12h: totalRondas12h,
        ultimaRondaStatus: ultimaRonda ? (ultimaRonda.status || 'Concluída') : 'Sem registros'
      });
    } catch (err) {
      console.error('Erro ao varrer pendências dos módulos:', err);
    }
  };

  const toggleChecklist = (item) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const realizarPassagemPosto = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { data: opEntrante, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('login', loginEntrante.trim())
        .eq('senha', senhaEntrante.trim())
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('ativo', true)
        .maybeSingle();

      if (opError) throw opError;

      if (!opEntrante) {
        setMensagem({ tipo: 'erro', texto: 'Credenciais do operador entrante incorretas.' });
        setLoading(false);
        return;
      }

      if (opEntrante.id === usuarioLogado.id) {
        setMensagem({ tipo: 'erro', texto: 'O operador entrante deve ser diferente do sainte.' });
        setLoading(false);
        return;
      }

      const agora = new Date();
      const dia = String(agora.getDate()).padStart(2, '0');
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ano = String(agora.getFullYear()).slice(-2);
      const codigoPas = `PAS:${dia}${mes}${ano}OPER${String(agora.getMinutes()).padStart(2, '0')}`;

      const novaPassagem = {
        condominio_id: usuarioLogado.condominio_id,
        codigo: codigoPas,
        operador_sainte_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_entrante_nome: opEntrante.nome || opEntrante.login,
        checklist: checklist,
        pendencias: resumoPendencias,
        observacoes: observacoes.trim() || 'Sem observações gravadas para o próximo turno.',
        divergencia: temDivergencia ? divergencia.trim() : null,
        status: temDivergencia ? 'Divergência Registrada' : 'Concluída'
      };

      const { error } = await supabase
        .from('passagens_posto')
        .insert([novaPassagem]);

      if (error) throw error;

      setModalNova(false);
      setLoginEntrante('');
      setSenhaEntrante('');
      setObservacoes('');
      setDivergencia('');
      setTemDivergencia(false);

      if (onTrocarOperador) {
        onTrocarOperador(opEntrante);
      } else {
        carregarPassagens();
        setMensagem({ tipo: 'sucesso', texto: `Passagem de posto concluída! Novo operador ativo: ${opEntrante.nome}` });
      }

    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar passagem: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const gerarLinkWhatsApp = (item) => {
    const dataHora = new Date(item.created_at).toLocaleString('pt-BR');
    const pend = item.pendencias || {};

    const texto = `🔄 *RELATÓRIO COMPLETO DE PASSAGEM DE POSTO*\n` +
      `Código: ${item.codigo || 'PAS:INFPORT'}\n` +
      `Data/Hora: ${dataHora}\n\n` +
      `👤 *Operador Sainte (Saindo):* ${item.operador_sainte_nome}\n` +
      `👤 *Operador Entrante (Assumindo):* ${item.operador_entrante_nome}\n` +
      `📌 *Status:* ${item.status === 'Divergência Registrada' ? '⚠️ DIVERGÊNCIA APONTADA' : '🟢 CONCLUÍDA E VALIDADA'}\n\n` +
      `📊 *RESUMO GERAL DO POSTO:*\n` +
      `📦 *Módulo 02 - Encomendas Retidas:* ${pend.encomendasPendentes || 0} volume(s)\n` +
      `🎁 *Módulo 03 - Custódia (Aguardando Retirada):* ${pend.custodiasPendentes || 0} item(ns)\n` +
      `🔦 *Módulo 04 - Materiais Posto:* ${pend.materiaisOk ? '100% OK' : 'Avarias Mapeadas'}\n` +
      `🔑 *Módulo 05 - Quadro Chaves:* ${pend.chavesFora || 0} chave(s) fora\n` +
      `🛠️ *Módulo 06/08 - Ocorrências/OS:* ${pend.ocorrenciasAbertas || 0} pendente(s)\n` +
      `🚨 *Módulo 07 - Rondas nas últimas 12h:* ${pend.rondasUltimas12h || 0} ronda(s)\n\n` +
      `💬 *RECADOS E INSTRUÇÕES DO TURNO:*\n` +
      `"${item.observacoes}"\n` +
      (item.divergencia ? `\n⚠️ *DIVERGÊNCIA APONTADA:*\n"${item.divergencia}"` : '');

    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabecalho Principal */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Repeat className="w-3.5 h-3.5" /> Módulo 09 - Passagem de Posto
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Passagem de Posto Auditada
          </h3>
          <p className="text-xs text-slate-300">
            Relatório consolidado automático dos Módulos 01 a 08 com Dupla Assinatura Digital.
          </p>
        </div>

        <button
          onClick={abrirNovaPassagem}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase shadow-md"
        >
          <Plus className="w-4 h-4" /> Iniciar Troca de Turno
        </button>
      </div>

      {/* Alertas */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* Lista de Registros Anteriores */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" /> Histórico de Trocas de Turno Registradas
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passagens.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" /> {item.codigo || 'PAS:CONCLUÍDO'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.status === 'Divergência Registrada' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.status || 'Concluída'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Sainte (Saindo):</span>
                    <strong className="text-slate-800">{item.operador_sainte_nome}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Entrante (Assumiu):</span>
                    <strong className="text-emerald-700">{item.operador_entrante_nome}</strong>
                  </div>
                </div>

                {/* Resumo Completo das Pendencias Mapeadas */}
                <div className="text-[11px] space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 uppercase text-[10px] block border-b pb-1">Relatório dos Módulos:</span>
                  <div className="grid grid-cols-2 gap-1.5 text-slate-600">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-purple-600" /> Encomendas Retidas: <strong>{item.pendencias?.encomendasPendentes || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Box className="w-3 h-3 text-blue-600" /> Custódia Padrão: <strong>{item.pendencias?.custodiasPendentes || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-600" /> Chaves Fora: <strong>{item.pendencias?.chavesFora || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-600" /> Equipamentos: <strong>{item.pendencias?.materiaisOk ? 'OK' : 'Atenção'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-red-500" /> Ocorrências/OS: <strong>{item.pendencias?.ocorrenciasAbertas || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-indigo-600" /> Rondas (12h): <strong>{item.pendencias?.rondasUltimas12h || 0} realizada(s)</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  "{item.observacoes}"
                </p>

                {item.divergencia && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong>Divergência Notada:</strong> {item.divergencia}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                </span>
                <a
                  href={gerarLinkWhatsApp(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            </div>
          ))}

          {passagens.length === 0 && !loading && (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 italic text-xs">
              Nenhuma passagem de posto registrada até o momento.
            </div>
          )}
        </div>
      </div>

      {/* MODAL TROCA DE TURNO E DUPLA ASSINATURA */}
      {modalNova && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalNova(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" /> Relatório de Passagem de Posto
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Etapa {etapa} de 3
              </span>
            </div>

            {/* ETAPA 1: Relatorio Completo Mapeado */}
            {etapa === 1 && (
              <div className="space-y-4">
                <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs flex justify-between items-center">
                  <span>Operador Sainte (Saindo):</span>
                  <strong className="text-emerald-400 bg-slate-800 px-2.5 py-1 rounded">{usuarioLogado?.nome || usuarioLogado?.login}</strong>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase">
                    Consolidação de Módulos da Portaria
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div>
                        <span className="block text-[10px] text-purple-700">Encomendas:</span>
                        <strong className="text-purple-950">{resumoPendencias.encomendasPendentes} retida(s)</strong>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <span className="block text-[10px] text-blue-700">Custódia:</span>
                        <strong className="text-blue-950">{resumoPendencias.custodiasPendentes} aguardando</strong>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="block text-[10px] text-amber-700">Chaves Fora:</span>
                        <strong className="text-amber-950">{resumoPendencias.chavesFora} em uso</strong>
                      </div>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="block text-[10px] text-emerald-700">Equipamentos:</span>
                        <strong className="text-emerald-950">{resumoPendencias.materiaisOk ? '100% OK' : 'Avarias'}</strong>
                      </div>
                    </div>

                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <div>
                        <span className="block text-[10px] text-red-700">Ocorrências/OS:</span>
                        <strong className="text-red-950">{resumoPendencias.ocorrenciasAbertas} abertas</strong>
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-2">
                      <Footprints className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div>
                        <span className="block text-[10px] text-indigo-700">Rondas (12h):</span>
                        <strong className="text-indigo-950">{resumoPendencias.rondasUltimas12h} realizada(s)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checklist Manual de Conferencia */}
                <div className="space-y-2 border-t pt-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase">Checklist da Guarita</label>

                  <div className="space-y-1 text-xs">
                    <button type="button" onClick={() => toggleChecklist('encomendasOk')} className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-slate-50">
                      {checklist.encomendasOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <span>Encomendas físicas conferidas com o saldo retido.</span>
                    </button>

                    <button type="button" onClick={() => toggleChecklist('custodiaOk')} className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-slate-50">
                      {checklist.custodiaOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <span>Objetos de custódia aguardando retirada conferidos.</span>
                    </button>

                    <button type="button" onClick={() => toggleChecklist('materiaisOk')} className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-slate-50">
                      {checklist.materiaisOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <span>HTs, lanternas e equipamentos testados.</span>
                    </button>

                    <button type="button" onClick={() => toggleChecklist('chavesOk')} className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-slate-50">
                      {checklist.chavesOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <span>Quadro de chaves confere com as devoluções registradas.</span>
                    </button>

                    <button type="button" onClick={() => toggleChecklist('limpezaOk')} className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-slate-50">
                      {checklist.limpezaOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <span>Guarita limpa e organizada para o próximo turno.</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setEtapa(2)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 transition"
                >
                  Avançar para Observações & Divergências <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ETAPA 2: Recados do Turno & Divergencias */}
            {etapa === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Recados e Avisos do Turno</label>
                  <textarea
                    rows="3"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Avisos sobre entregas, moradores, agendamentos do dia..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                  ></textarea>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Registrar Divergência
                    </label>
                    <input
                      type="checkbox"
                      checked={temDivergencia}
                      onChange={(e) => setTemDivergencia(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                  </div>

                  {temDivergencia && (
                    <textarea
                      rows="2"
                      value={divergencia}
                      onChange={(e) => setDivergencia(e.target.value)}
                      placeholder="Especifique a divergência (ex: 1 volume não encontrado fisicamente, chave em falta sem registro)..."
                      className="w-full p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs resize-none"
                    ></textarea>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEtapa(1)}
                    className="w-1/3 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setEtapa(3)}
                    className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    Avançar para Dupla Assinatura <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: Dupla Assinatura Digital do Operador Entrante */}
            {etapa === 3 && (
              <form onSubmit={realizarPassagemPosto} className="space-y-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-3">
                  <label className="block text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-700" /> Assinatura do Operador Entrante
                  </label>
                  <p className="text-[11px] text-emerald-800">
                    O operador que assume o posto deve informar seu login e senha abaixo para validar a passagem e assumir a sessão.
                  </p>

                  <div className="space-y-2">
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={loginEntrante}
                        onChange={(e) => setLoginEntrante(e.target.value)}
                        placeholder="Login do Operador Entrante"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={senhaEntrante}
                        onChange={(e) => setSenhaEntrante(e.target.value)}
                        placeholder="Senha do Operador Entrante"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                    className="w-1/3 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl text-xs"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition shadow-md"
                  >
                    {loading ? 'Assinando...' : 'Assinar e Finalizar Passagem'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
