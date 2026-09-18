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
  Square
} from 'lucide-react';

export default function PassagemPosto({ usuarioLogado, onTrocarOperador }) {
  const [passagens, setPassagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Modal e Validação de Dupla Assinatura
  const [modalNova, setModalNova] = useState(false);
  const [loginEntrante, setLoginEntrante] = useState('');
  const [senhaEntrante, setSenhaEntrante] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Checklist do Turno
  const [checklist, setChecklist] = useState({
    materiaisOk: true,
    chavesOk: true,
    encomendasOk: true,
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

  const toggleChecklist = (item) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const realizarPassagemPosto = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      // Validar a autenticação do operador entrante (Dupla Assinatura)
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
        setMensagem({ tipo: 'erro', texto: 'Credenciais do operador entrante inválidas ou não pertencem a este condomínio.' });
        setLoading(false);
        return;
      }

      if (opEntrante.id === usuarioLogado.id) {
        setMensagem({ tipo: 'erro', texto: 'O operador entrante deve ser diferente do operador sainte.' });
        setLoading(false);
        return;
      }

      // Registrar a passagem de posto auditada
      const novaPassagem = {
        condominio_id: usuarioLogado.condominio_id,
        operador_sainte_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_entrante_nome: opEntrante.nome || opEntrante.login,
        checklist: checklist,
        observacoes: observacoes.trim() || 'Sem observações adicionais.'
      };

      const { data, error } = await supabase
        .from('passagens_posto')
        .insert([novaPassagem])
        .select()
        .single();

      if (error) throw error;

      setModalNova(false);
      setLoginEntrante('');
      setSenhaEntrante('');
      setObservacoes('');

      // Disparar atualização e login automático do operador entrante se a função de troca existir
      if (onTrocarOperador) {
        onTrocarOperador(opEntrante);
      } else {
        carregarPassagens();
        setMensagem({ tipo: 'sucesso', texto: `Passagem de posto concluída com sucesso! Novo operador em plantão: ${opEntrante.nome}` });
      }

    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar passagem: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const gerarLinkWhatsApp = (item) => {
    const dataHora = new Date(item.created_at).toLocaleString('pt-BR');
    const chk = item.checklist || {};

    const texto = `📋 *RELATÓRIO DE PASSAGEM DE POSTO - INFPORT*\n` +
      `----------------------------------------\n` +
      `🚪 *Operador Sainte:* ${item.operador_sainte_nome}\n` +
      `🔑 *Operador Entrante:* ${item.operador_entrante_nome}\n` +
      `📅 *Data/Hora:* ${dataHora}\n` +
      `----------------------------------------\n` +
      `✅ *CONFERÊNCIA DE ROTINA:*\n` +
      `${chk.materiaisOk ? '✔️' : '❌'} Materiais e Equipamentos (HTs/Lanternas)\n` +
      `${chk.chavesOk ? '✔️' : '❌'} Quadro de Chaves\n` +
      `${chk.encomendasOk ? '✔️' : '❌'} Encomendas Pendentes na Guarita\n` +
      `${chk.limpezaOk ? '✔️' : '❌'} Limpeza e Organização da Guarita\n` +
      `${chk.ocorrenciasCientes ? '✔️' : '❌'} Ciente das Ocorrências do Plantão\n` +
      `----------------------------------------\n` +
      `📝 *Observações:* \n${item.observacoes}`;

    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Repeat className="w-3.5 h-3.5" /> Módulo 09 - Passagem de Posto
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Passagem Auditada e Dupla Assinatura
          </h3>
          <p className="text-xs text-slate-300">
            Troca oficial de plantão com assinatura do operador entrante e checklist da guarita.
          </p>
        </div>

        <button
          onClick={() => setModalNova(true)}
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

      {/* Histórico de Passagens de Posto */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" /> Histórico de Passagens Registradas
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passagens.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" /> Posto Passado com Sucesso
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Sainte (Saindo):</span>
                    <strong className="text-slate-800">{item.operador_sainte_nome}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Entrante (Assinou):</span>
                    <strong className="text-emerald-700">{item.operador_entrante_nome}</strong>
                  </div>
                </div>

                {/* Resumo do Checklist */}
                <div className="text-[11px] space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 uppercase text-[10px] block mb-1">Checklist de Passagem:</span>
                  <div className="grid grid-cols-2 gap-1 text-slate-600">
                    <span className={item.checklist?.materiaisOk ? 'text-emerald-700 font-medium' : 'text-red-600'}>
                      {item.checklist?.materiaisOk ? '✓' : '✗'} Materiais/Equipamentos
                    </span>
                    <span className={item.checklist?.chavesOk ? 'text-emerald-700 font-medium' : 'text-red-600'}>
                      {item.checklist?.chavesOk ? '✓' : '✗'} Quadro de Chaves
                    </span>
                    <span className={item.checklist?.encomendasOk ? 'text-emerald-700 font-medium' : 'text-red-600'}>
                      {item.checklist?.encomendasOk ? '✓' : '✗'} Encomendas
                    </span>
                    <span className={item.checklist?.limpezaOk ? 'text-emerald-700 font-medium' : 'text-red-600'}>
                      {item.checklist?.limpezaOk ? '✓' : '✗'} Guarita Limpa
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  "{item.observacoes}"
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <a
                  href={gerarLinkWhatsApp(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar Relatório WhatsApp
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalNova(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" /> Troca de Turno — Dupla Assinatura
            </h3>

            <div className="bg-slate-100 p-3 rounded-xl text-xs text-slate-700 flex justify-between items-center">
              <span>Saindo do Plantão:</span>
              <strong className="text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">{usuarioLogado?.nome || usuarioLogado?.login}</strong>
            </div>

            <form onSubmit={realizarPassagemPosto} className="space-y-4">
              {/* Checklist */}
              <div className="space-y-2 border-b pb-4">
                <label className="block text-xs font-bold text-slate-800 uppercase">1. Checklist do Posto de Trabalho</label>

                <div className="space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleChecklist('materiaisOk')}
                    className="flex items-center gap-2 text-slate-700 w-full text-left p-2 rounded hover:bg-slate-50"
                  >
                    {checklist.materiaisOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span>Materiais do posto (HTs, lanternas, carregadores) confere.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleChecklist('chavesOk')}
                    className="flex items-center gap-2 text-slate-700 w-full text-left p-2 rounded hover:bg-slate-50"
                  >
                    {checklist.chavesOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span>Quadro de chaves conferido e sem pendências não registradas.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleChecklist('encomendasOk')}
                    className="flex items-center gap-2 text-slate-700 w-full text-left p-2 rounded hover:bg-slate-50"
                  >
                    {checklist.encomendasOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span>Encomendas em custódia organizadas.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleChecklist('limpezaOk')}
                    className="flex items-center gap-2 text-slate-700 w-full text-left p-2 rounded hover:bg-slate-50"
                  >
                    {checklist.limpezaOk ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span>Guarita limpa, organizada e sem lixo acumulado.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleChecklist('ocorrenciasCientes')}
                    className="flex items-center gap-2 text-slate-700 w-full text-left p-2 rounded hover:bg-slate-50"
                  >
                    {checklist.ocorrenciasCientes ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span>Ciente das ocorrências registradas no livro digital.</span>
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">2. Observações para o Próximo Turno</label>
                <textarea
                  rows="2"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informe avisos importantes, prestadores ainda no condomínio, etc..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              {/* Dupla Assinatura - Login do Entrante */}
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-3">
                <label className="block text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-700" /> 3. Assinatura Digital do Operador Entrante
                </label>
                <p className="text-[11px] text-emerald-800">
                  O operador que está assumindo o posto deve digitar seu login e senha abaixo para confirmar e assumir a sessão.
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition shadow-md"
              >
                {loading ? 'Validando Assinatura...' : 'Assinar & Transferir Plantão'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
