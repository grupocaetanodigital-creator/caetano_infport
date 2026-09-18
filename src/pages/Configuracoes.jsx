import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Settings, 
  Sliders, 
  MessageSquare, 
  PhoneCall, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Plus, 
  Trash2, 
  Phone, 
  MessageCircle, 
  Send, 
  X, 
  Clock, 
  Building2, 
  Users, 
  Wrench, 
  Shield 
} from 'lucide-react';

export default function Configuracoes({ usuarioLogado }) {
  const [abaAtiva, setAbaAtiva] = useState('flags'); // 'flags', 'templates', 'emergencia'
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [modalEmergenciaAberto, setModalEmergenciaAberto] = useState(false);

  // 1. Estados da Parametrização & Feature Flags
  const [config, setConfig] = useState({
    mod02_controle_acesso: true,
    mod03_gestao_encomendas: true,
    mod04_materiais_posto: true,
    mod05_quadro_chaves: true,
    mod06_gestao_manutencao: true,
    mod07_gestao_ronda: true,
    mod08_livro_ocorrencias: true,
    mod09_passagem_posto: true,
    mod10_prestadores_servico: true,
    horario_inicio_obras: '08:00',
    horario_fim_obras: '17:00',
    tempo_maximo_retencao_chaves_padrao: 2,
    tolerancia_inicio_ronda_minutos: 15
  });

  // 2. Estados dos Templates de WhatsApp
  const [templates, setTemplates] = useState([]);
  const [templateSelecionado, setTemplateSelecionado] = useState({
    codigo_evento: 'ENCOMENDA_CHEGOU',
    canal_destino: 'Morador Direct',
    corpo_texto: 'Olá {NOME_MORADOR}, sua encomenda {CODIGO} chegou na portaria do condomínio e está disponível para retirada!'
  });

  // 3. Estados da Agenda de Emergência & Escala
  const [contatos, setContatos] = useState([]);
  const [novoContato, setNovoContato] = useState({
    categoria: 'Órgão Público',
    nome_descricao: '',
    telefone_principal: '',
    telefone_whatsapp: '',
    exibir_menu_flutuante: true
  });

  useEffect(() => {
    if (usuarioLogado?.condominio_id) {
      carregarConfiguracoes();
      carregarTemplates();
      carregarContatosEmergencia();
    }
  }, [usuarioLogado]);

  // Carregar Dados da Tabela configuracoes
  const carregarConfiguracoes = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          mod02_controle_acesso: data.mod02_controle_acesso ?? true,
          mod03_gestao_encomendas: data.mod03_gestao_encomendas ?? true,
          mod04_materiais_posto: data.mod04_materiais_posto ?? true,
          mod05_quadro_chaves: data.mod05_quadro_chaves ?? true,
          mod06_gestao_manutencao: data.mod06_gestao_manutencao ?? true,
          mod07_gestao_ronda: data.mod07_gestao_ronda ?? true,
          mod08_livro_ocorrencias: data.mod08_livro_ocorrencias ?? true,
          mod09_passagem_posto: data.mod09_passagem_posto ?? true,
          mod10_prestadores_servico: data.mod10_prestadores_servico ?? true,
          horario_inicio_obras: data.horario_inicio_obras || '08:00',
          horario_fim_obras: data.horario_fim_obras || '17:00',
          tempo_maximo_retencao_chaves_padrao: data.tempo_maximo_retencao_chaves_padrao || 2,
          tolerancia_inicio_ronda_minutos: data.tolerancia_inicio_ronda_minutos || 15
        });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  // Carregar Templates do WhatsApp
  const carregarTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates_whatsapp')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    }
  };

  // Carregar Agenda de Emergência
  const carregarContatosEmergencia = async () => {
    try {
      const { data, error } = await supabase
        .from('agenda_emergencia')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('categoria', { ascending: true });

      if (error) throw error;
      setContatos(data || []);
    } catch (err) {
      console.error('Erro ao carregar contatos de emergência:', err);
    }
  };

  // Salvar Parametrização e Feature Flags
  const salvarParametrizacao = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        ...config
      };

      const { error } = await supabase
        .from('configuracoes')
        .upsert([payload], { onConflict: 'condominio_id' });

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Parametrização e regras salvas com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar parametrização: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Salvar/Atualizar Template de WhatsApp
  const salvarTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        codigo_evento: templateSelecionado.codigo_evento,
        canal_destino: templateSelecionado.canal_destino,
        corpo_texto: templateSelecionado.corpo_texto
      };

      const { error } = await supabase
        .from('templates_whatsapp')
        .upsert([payload]);

      if (error) throw error;

      carregarTemplates();
      setMensagem({ tipo: 'sucesso', texto: 'Template de WhatsApp atualizado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar template: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Testar Disparo de Template do WhatsApp
  const testarTemplate = () => {
    const textoFormatado = `⚙️ *TESTE DE CONFIGURAÇÃO DE TEMPLATE DE WHATSAPP*\n` +
      `Condomínio: ${usuarioLogado?.condominio_nome || 'Residencial Caetano'}\n` +
      `Módulo de Origem: Módulo 11 - Motor de Comunicação\n\n` +
      `• Status da Integração: 🟢 OPERACIONAL\n` +
      `• Modo de Envio: Deep Link Direct (API Nativa)\n` +
      `• Evento: ${templateSelecionado.codigo_evento}\n\n` +
      `*Texto do Template:*\n"${templateSelecionado.corpo_texto}"`;

    window.open(`https://wa.me/?text=${encodeURIComponent(textoFormatado)}`, '_blank');
  };

  // Adicionar Contato na Agenda de Emergência
  const adicionarContato = async (e) => {
    e.preventDefault();
    if (!novoContato.nome_descricao || !novoContato.telefone_principal) return;

    setLoading(true);
    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        ...novoContato
      };

      const { error } = await supabase
        .from('agenda_emergencia')
        .insert([payload]);

      if (error) throw error;

      setNovoContato({
        categoria: 'Órgão Público',
        nome_descricao: '',
        telefone_principal: '',
        telefone_whatsapp: '',
        exibir_menu_flutuante: true
      });
      carregarContatosEmergencia();
      setMensagem({ tipo: 'sucesso', texto: 'Contato de emergência adicionado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao adicionar contato: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Excluir Contato de Emergência
  const excluirContato = async (id) => {
    try {
      const { error } = await supabase
        .from('agenda_emergencia')
        .delete()
        .eq('id', id);

      if (error) throw error;
      carregarContatosEmergencia();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir contato: ' + err.message });
    }
  };

  // Disparar Alerta de Pânico de Emergência via WhatsApp
  const dispararPanico = (contato) => {
    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}H`;

    const textoPanico = `🚨 *ALERTA DE EMERGÊNCIA / PÂNICO ACIONADO NA GUARITA*\n` +
      `Condomínio: ${usuarioLogado?.condominio_nome || 'Residencial Caetano'}\n` +
      `Posto: Guarita Principal\n\n` +
      `• Acionado por: ${usuarioLogado?.login || 'OPERADOR'}\n` +
      `• Tipo de Ocorrência: Solicitação de Apoio Imediato (${contato.nome_descricao})\n` +
      `• Data/Hora do Disparo: ${dataHoraStr}\n\n` +
      `A central da INFPORT e a supervisão foram notificadas. Favor entrar em contato imediato com o posto!`;

    const num = contato.telefone_whatsapp || contato.telefone_principal;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(textoPanico)}`, '_blank');
  };

  return (
    <div className="space-y-6 relative">
      {/* Cabeçalho Principal do Módulo 11 */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Settings className="w-3.5 h-3.5" /> Módulo 11 - Configurações & Regras
          </span>
          <h3 className="font-bold text-lg mt-1">Painel Administrador Master & Parametrização</h3>
          <p className="text-xs text-slate-300">Feature Flags, Motor de Templates WhatsApp e Agenda de Emergência.</p>
        </div>

        {/* Botão Fixo de Emergência / Pânico Flutuante */}
        <button
          onClick={() => setModalEmergenciaAberto(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition uppercase shadow-lg animate-pulse"
        >
          <ShieldAlert className="w-5 h-5" /> Pânico / Emergência
        </button>
      </div>

      {/* Alertas Gerais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* Menu de Abas Internas do Módulo 11 */}
      <div className="flex border-b border-slate-200 gap-2 bg-white p-2 rounded-xl shadow-sm">
        <button
          onClick={() => setAbaAtiva('flags')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'flags' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" /> 11.1 Parametrização (Feature Flags)
        </button>

        <button
          onClick={() => setAbaAtiva('templates')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'templates' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> 11.2 Templates de WhatsApp
        </button>

        <button
          onClick={() => setAbaAtiva('emergencia')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            abaAtiva === 'emergencia' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" /> 11.3 Agenda de Emergência & Escala
        </button>
      </div>

      {/* ABA 11.1: PARAMETRIZAÇÃO E FEATURE FLAGS */}
      {abaAtiva === 'flags' && (
        <form onSubmit={salvarParametrizacao} className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" /> Ativação de Módulos Contratados (Toggle Switches)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'mod02_controle_acesso', label: 'Módulo 02 — Controle de Acesso' },
                { key: 'mod03_gestao_encomendas', label: 'Módulo 03 — Gestão de Encomendas' },
                { key: 'mod04_materiais_posto', label: 'Módulo 04 — Materiais do Posto' },
                { key: 'mod05_quadro_chaves', label: 'Módulo 05 — Quadro de Chaves' },
                { key: 'mod06_gestao_manutencao', label: 'Módulo 06 — Gestão de Manutenção' },
                { key: 'mod07_gestao_ronda', label: 'Módulo 07 — Gestão de Ronda' },
                { key: 'mod08_livro_ocorrencias', label: 'Módulo 08 — Livro de Ocorrências' },
                { key: 'mod09_passagem_posto', label: 'Módulo 09 — Passagem de Posto' },
                { key: 'mod10_prestadores_servico', label: 'Módulo 10 — Prestadores de Serviço' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config[item.key]}
                      onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Regras Globais do Condomínio
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Horário Início Obras</label>
                <input
                  type="time"
                  value={config.horario_inicio_obras}
                  onChange={(e) => setConfig({ ...config, horario_inicio_obras: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Horário Fim Obras</label>
                <input
                  type="time"
                  value={config.horario_fim_obras}
                  onChange={(e) => setConfig({ ...config, horario_fim_obras: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Max Retenção Chaves (Horas)</label>
                <input
                  type="number"
                  value={config.tempo_maximo_retencao_chaves_padrao}
                  onChange={(e) => setConfig({ ...config, tempo_maximo_retencao_chaves_padrao: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tolerância Ronda (Minutos)</label>
                <input
                  type="number"
                  value={config.tolerancia_inicio_ronda_minutos}
                  onChange={(e) => setConfig({ ...config, tolerancia_inicio_ronda_minutos: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md transition"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Regras & Parametrização'}
            </button>
          </div>
        </form>
      )}

      {/* ABA 11.2: MOTOR DE TEMPLATES DE WHATSAPP */}
      {abaAtiva === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Editor de Templates do WhatsApp
            </h4>

            <form onSubmit={salvarTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Evento Desencadeador</label>
                  <select
                    value={templateSelecionado.codigo_evento}
                    onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, codigo_evento: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="ENCOMENDA_CHEGOU">ENCOMENDA_CHEGOU</option>
                    <option value="CHAVE_ATRASADA">CHAVE_ATRASADA</option>
                    <option value="CHAMADO_ABERTO">CHAMADO_ABERTO</option>
                    <option value="RONDA_AUSENTE">RONDA_AUSENTE</option>
                    <option value="PRESTADOR_ENTROU">PRESTADOR_ENTROU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Canal de Destino</label>
                  <select
                    value={templateSelecionado.canal_destino}
                    onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, canal_destino: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Morador Direct">WhatsApp Morador Direct</option>
                    <option value="Grupo Gestão">Grupo Gestão / Síndico</option>
                    <option value="WhatsApp Supervisor">WhatsApp Supervisor INFPORT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Corpo do Texto do Template (Com marcadores dinâmicos)
                </label>
                <textarea
                  rows="4"
                  value={templateSelecionado.corpo_texto}
                  onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, corpo_texto: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono resize-none"
                ></textarea>
                <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] text-slate-500 font-mono">
                  <span>Marcadores:</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700">{`{NOME_MORADOR}`}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700">{`{UNIDADE}`}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700">{`{CODIGO}`}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700">{`{PRESTADOR}`}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700">{`{CRACHA}`}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700">{`{HORA}`}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={testarTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" /> Testar Envio no WhatsApp
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABA 11.3: AGENDA DE EMERGÊNCIA & ESCALA */}
      {abaAtiva === 'emergencia' && (
        <div className="space-y-6">
          {/* Form para adicionar novo contato */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" /> Cadastrar Contato de Emergência ou Escala
            </h4>

            <form onSubmit={adicionarContato} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Categoria</label>
                <select
                  value={novoContato.categoria}
                  onChange={(e) => setNovoContato({ ...novoContato, categoria: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="Órgão Público">Órgão Público</option>
                  <option value="Gestão Interna">Gestão Interna</option>
                  <option value="Supervisão INFPORT">Supervisão INFPORT</option>
                  <option value="Manutenção de Emergência">Manutenção de Emergência</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nome / Empresa *</label>
                <input
                  type="text"
                  required
                  value={novoContato.nome_descricao}
                  onChange={(e) => setNovoContato({ ...novoContato, nome_descricao: e.target.value })}
                  placeholder="Ex: Atlas Schindler Elevadores"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Telefone Principal *</label>
                <input
                  type="text"
                  required
                  value={novoContato.telefone_principal}
                  onChange={(e) => setNovoContato({ ...novoContato, telefone_principal: e.target.value })}
                  placeholder="Ex: 11999999999"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  value={novoContato.telefone_whatsapp}
                  onChange={(e) => setNovoContato({ ...novoContato, telefone_whatsapp: e.target.value })}
                  placeholder="Ex: 11999999999"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="col-span-full flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Adicionar à Agenda
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Contatos por Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contatos.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {c.categoria}
                  </span>
                  <h5 className="font-bold text-slate-900 text-sm">{c.nome_descricao}</h5>
                  <p className="text-xs text-slate-500 font-mono">Tel: {c.telefone_principal}</p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.telefone_principal.replace(/\D/g, '')}`}
                    className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg text-xs flex items-center gap-1 font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>

                  {c.telefone_whatsapp && (
                    <button
                      onClick={() => dispararPanico(c)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg text-xs flex items-center gap-1 font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  )}

                  <button
                    onClick={() => excluirContato(c.id)}
                    className="text-slate-400 hover:text-red-600 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL FLUTUANTE DE EMERGÊNCIA & ESCALA DA GUARITA (11.3) */}
      {modalEmergenciaAberto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalEmergenciaAberto(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-6 h-6" />
            </button>

            <div className="border-b pb-3 flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Painel de Emergência e Escala (Portaria)</h3>
                <p className="text-xs text-slate-500">Discagem de 1 clique ou alerta de pânico via WhatsApp para a central.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {/* Órgãos Públicos Fixos */}
              <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex justify-between items-center">
                <div>
                  <strong className="block text-red-950 text-xs">Polícia Militar (190)</strong>
                  <span className="text-[10px] text-red-700">Invasão, roubo ou ameaça</span>
                </div>
                <a href="tel:190" className="bg-red-600 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> 190
                </a>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <strong className="block text-amber-950 text-xs">Bombeiros (193)</strong>
                  <span className="text-[10px] text-amber-700">Incêndio, resgate ou vazamento</span>
                </div>
                <a href="tel:193" className="bg-amber-600 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> 193
                </a>
              </div>

              {/* Contatos Dinâmicos Cadastrados na Agenda */}
              {contatos.map((item) => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <strong className="block text-slate-900 text-xs">{item.nome_descricao}</strong>
                    <span className="text-[10px] text-slate-500">{item.categoria}</span>
                  </div>
                  <div className="flex gap-1">
                    <a href={`tel:${item.telefone_principal.replace(/\D/g, '')}`} className="bg-slate-900 text-white px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Ligar
                    </a>
                    {item.telefone_whatsapp && (
                      <button onClick={() => dispararPanico(item)} className="bg-emerald-600 text-white px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Pânico
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
