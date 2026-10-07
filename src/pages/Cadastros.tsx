import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Home, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Pencil, 
  X,
  Filter,
  ShieldCheck,
  Clock,
  MessageCircle,
  ExternalLink,
  Phone,
  Sparkles,
  Edit3
} from 'lucide-react';
import { 
  carregarCondominioConfig, 
  salvarCondominioConfig, 
  OPCOES_ESCALA, 
  CondominioConfig 
} from '../services/condominioService';

interface CadastrosProps {
  usuarioLogado?: any;
}

export default function Cadastros({ usuarioLogado }: CadastrosProps) {
  const eAdmin = usuarioLogado?.perfil === 'admin' || usuarioLogado?.nivel_acesso === 0;
  const eMaster = usuarioLogado?.perfil === 'master' || usuarioLogado?.nivel_acesso === 1;
  const eSupervisor = usuarioLogado?.perfil === 'supervisor' || usuarioLogado?.nivel_acesso === 2;
  const eOperador = usuarioLogado?.perfil === 'operador' || usuarioLogado?.nivel_acesso === 3;

  const [condominioFiltroAdmin, setCondominioFiltroAdmin] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(eAdmin ? 'condominios' : 'moradores');

  const [condominios, setCondominios] = useState<any[]>([]);
  const [mapaConfigsCondos, setMapaConfigsCondos] = useState<Record<string, CondominioConfig>>({});
  const [operadores, setOperadores] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Controle do Menu Flutuante / Modal de Cadastro e Edição no Card
  const [modalFlutuanteAberto, setModalFlutuanteAberto] = useState(false);
  const [tipoModalFlutuante, setTipoModalFlutuante] = useState<'condominio' | 'operador' | 'morador'>('morador');
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  // Filtros de busca individuais
  const [buscaCondominio, setBuscaCondominio] = useState('');
  const [buscaOperador, setBuscaOperador] = useState('');
  const [termoBuscaMorador, setTermoBuscaMorador] = useState('');

  // Formulário Condomínio
  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');
  const [escalaPlantao, setEscalaPlantao] = useState<'06_18' | '07_19' | '08_20' | 'personalizado'>('06_18');
  const [horarioDiurnoInicio, setHorarioDiurnoInicio] = useState('06:00');
  const [horarioNoturnoInicio, setHorarioNoturnoInicio] = useState('18:00');
  const [whatsappGrupoUrl, setWhatsappGrupoUrl] = useState('');
  const [telefonePortaria, setTelefonePortaria] = useState('');
  const [sindicoNome, setSindicoNome] = useState('');
  const [sindicoWhatsapp, setSindicoWhatsapp] = useState('');

  // Formulário Operador
  const [nomeOperador, setNomeOperador] = useState('');
  const [loginOperador, setLoginOperador] = useState('');
  const [senhaOperador, setSenhaOperador] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('3');
  const [condominioIdOperador, setCondominioIdOperador] = useState('');

  // Formulário Morador
  const [nomeMorador, setNomeMorador] = useState('');
  const [blocoMorador, setBlocoMorador] = useState('');
  const [unidadeMorador, setUnidadeMorador] = useState('');
  const [telefoneMorador, setTelefoneMorador] = useState('');
  const [condominioIdMorador, setCondominioIdMorador] = useState('');

  useEffect(() => {
    carregarDados();
  }, [abaAtiva, condominioFiltroAdmin]);

  const limparFormularios = () => {
    setIdEdicao(null);
    setNomeCondominio('');
    setEnderecoCondominio('');
    setEscalaPlantao('06_18');
    setHorarioDiurnoInicio('06:00');
    setHorarioNoturnoInicio('18:00');
    setWhatsappGrupoUrl('');
    setTelefonePortaria('');
    setSindicoNome('');
    setSindicoWhatsapp('');
    setNomeOperador('');
    setLoginOperador('');
    setSenhaOperador('');
    setNivelAcesso('3');
    setCondominioIdOperador(eAdmin ? (condominioFiltroAdmin || '') : (usuarioLogado?.condominio_id || ''));
    setNomeMorador('');
    setBlocoMorador('');
    setUnidadeMorador('');
    setTelefoneMorador('');
    setCondominioIdMorador(eAdmin ? (condominioFiltroAdmin || '') : (usuarioLogado?.condominio_id || ''));
  };

  const fecharModalFlutuante = () => {
    setModalFlutuanteAberto(false);
    limparFormularios();
  };

  const abrirNovoCondominio = () => {
    limparFormularios();
    setTipoModalFlutuante('condominio');
    setModalFlutuanteAberto(true);
  };

  const abrirNovoOperador = () => {
    limparFormularios();
    setCondominioIdOperador(condominioFiltroAdmin || usuarioLogado?.condominio_id || (condominios[0]?.id || ''));
    setTipoModalFlutuante('operador');
    setModalFlutuanteAberto(true);
  };

  const abrirNovoMorador = () => {
    limparFormularios();
    setCondominioIdMorador(condominioFiltroAdmin || usuarioLogado?.condominio_id || (condominios[0]?.id || ''));
    setTipoModalFlutuante('morador');
    setModalFlutuanteAberto(true);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (abaAtiva === 'condominios' && eAdmin) {
        const { data, error } = await supabase.from('condominios').select('*').order('nome');
        if (error) throw error;
        setCondominios(data || []);

        const configs: Record<string, CondominioConfig> = {};
        for (const c of (data || [])) {
          const cfg = await carregarCondominioConfig(c.id);
          configs[c.id] = cfg;
        }
        setMapaConfigsCondos(configs);
      } else if (abaAtiva === 'operadores' && !eOperador) {
        let query = supabase.from('operadores').select('*').order('nome');
        if (eAdmin && condominioFiltroAdmin) {
          query = query.eq('condominio_id', condominioFiltroAdmin);
        } else if (!eAdmin && usuarioLogado?.condominio_id) {
          query = query.eq('condominio_id', usuarioLogado.condominio_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setOperadores(data || []);

        if (condominios.length === 0) {
          const { data: condoData } = await supabase.from('condominios').select('id, nome');
          setCondominios(condoData || []);
        }
      } else if (abaAtiva === 'moradores') {
        let query = supabase.from('moradores').select('*').order('unidade');
        if (eAdmin && condominioFiltroAdmin) {
          query = query.eq('condominio_id', condominioFiltroAdmin);
        } else if (!eAdmin && usuarioLogado?.condominio_id) {
          query = query.eq('condominio_id', usuarioLogado.condominio_id);
        }

        if (termoBuscaMorador.trim()) {
          query = query.ilike('nome', `%${termoBuscaMorador.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setMoradores(data || []);

        if (condominios.length === 0) {
          const { data: condoData } = await supabase.from('condominios').select('id, nome');
          setCondominios(condoData || []);
        }
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao carregar dados: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const getNomeCondominioPorId = (id: string) => {
    const c = condominios.find(item => item.id === id);
    return c ? c.nome : (id ? 'Condomínio Vinculado' : 'Não atribuído');
  };

  const salvarCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eAdmin) return;
    if (!nomeCondominio.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O nome do condomínio é obrigatório.' });
      return;
    }
    setLoading(true);

    try {
      let targetId = idEdicao;

      const opt = OPCOES_ESCALA.find(o => o.id === escalaPlantao);
      const configCondo: Partial<CondominioConfig> = {
        id: targetId || '',
        nome: nomeCondominio.trim(),
        endereco: enderecoCondominio.trim(),
        escala_plantao: escalaPlantao,
        horario_diurno_inicio: horarioDiurnoInicio,
        horario_noturno_inicio: horarioNoturnoInicio,
        escala_label: escalaPlantao === 'personalizado'
          ? `Personalizado (${horarioDiurnoInicio} às ${horarioNoturnoInicio})`
          : (opt?.label || '06:00 às 18:00 / 18:00 às 06:00'),
        whatsapp_grupo_url: whatsappGrupoUrl.trim() || '',
        telefone_portaria: telefonePortaria.trim() || '',
        sindico_nome: sindicoNome.trim() || '',
        sindico_whatsapp: sindicoWhatsapp.trim() || ''
      };

      if (idEdicao) {
        await salvarCondominioConfig(idEdicao, configCondo);
        setMensagem({ tipo: 'sucesso', texto: 'Condomínio e configurações de plantão/WhatsApp atualizados com sucesso!' });
      } else {
        const { data: novoCond, error } = await supabase
          .from('condominios')
          .insert([{ nome: nomeCondominio.trim(), endereco: enderecoCondominio.trim() }])
          .select()
          .single();

        if (error) throw error;
        targetId = novoCond.id;
        configCondo.id = novoCond.id;
        await salvarCondominioConfig(novoCond.id, configCondo);
        setMensagem({ tipo: 'sucesso', texto: 'Condomínio e configurações cadastrados com sucesso!' });
      }

      fecharModalFlutuante();
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoCondominio = (c: any) => {
    if (!eAdmin) return;
    setIdEdicao(c.id);
    setNomeCondominio(c.nome);
    setEnderecoCondominio(c.endereco || '');

    const cfg = mapaConfigsCondos[c.id];
    if (cfg) {
      setEscalaPlantao(cfg.escala_plantao || '06_18');
      setHorarioDiurnoInicio(cfg.horario_diurno_inicio || '06:00');
      setHorarioNoturnoInicio(cfg.horario_noturno_inicio || '18:00');
      setWhatsappGrupoUrl(cfg.whatsapp_grupo_url || '');
      setTelefonePortaria(cfg.telefone_portaria || '');
      setSindicoNome(cfg.sindico_nome || '');
      setSindicoWhatsapp(cfg.sindico_whatsapp || '');
    } else {
      setEscalaPlantao('06_18');
      setHorarioDiurnoInicio('06:00');
      setHorarioNoturnoInicio('18:00');
      setWhatsappGrupoUrl('');
      setTelefonePortaria('');
      setSindicoNome('');
      setSindicoWhatsapp('');
    }
    setTipoModalFlutuante('condominio');
    setModalFlutuanteAberto(true);
  };

  const salvarOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eOperador) {
      setMensagem({ tipo: 'erro', texto: 'Operadores de portaria não possuem permissão para criar usuários.' });
      return;
    }

    const targetCondominioId = eAdmin ? (condominioIdOperador || condominioFiltroAdmin) : usuarioLogado?.condominio_id;

    if (!nomeOperador.trim() || !loginOperador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome, login e selecione um condomínio.' });
      return;
    }

    setLoading(true);

    try {
      if (idEdicao) {
        const dadosAtualizacao: any = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim(),
          nivel_acesso: parseInt(nivelAcesso),
          condominio_id: targetCondominioId
        };
        if (senhaOperador.trim()) {
          dadosAtualizacao.senha = senhaOperador.trim();
        }

        const { error } = await supabase
          .from('operadores')
          .update(dadosAtualizacao)
          .eq('id', idEdicao);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador atualizado com sucesso!' });
      } else {
        if (!senhaOperador.trim()) {
          setMensagem({ tipo: 'erro', texto: 'Informe a senha para o novo operador.' });
          setLoading(false);
          return;
        }

        const { error } = await supabase.from('operadores').insert([
          {
            nome: nomeOperador.trim(),
            login: loginOperador.trim().toLowerCase(),
            senha: senhaOperador.trim(),
            nivel_acesso: parseInt(nivelAcesso),
            condominio_id: targetCondominioId,
            ativo: true
          }
        ]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador cadastrado com sucesso!' });
      }

      fecharModalFlutuante();
      carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar operador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoOperador = (op: any) => {
    if (eOperador) return;
    setIdEdicao(op.id);
    setNomeOperador(op.nome);
    setLoginOperador(op.login);
    setSenhaOperador('');
    setNivelAcesso(String(op.nivel_acesso));
    setCondominioIdOperador(op.condominio_id || '');
    setTipoModalFlutuante('operador');
    setModalFlutuanteAberto(true);
  };

  const salvarMorador = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetCondominioId = eAdmin ? (condominioIdMorador || condominioFiltroAdmin) : usuarioLogado?.condominio_id;

    if (!nomeMorador.trim() || !unidadeMorador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Nome, Unidade e Condomínio são obrigatórios.' });
      return;
    }
    setLoading(true);

    try {
      if (idEdicao) {
        const { error } = await supabase
          .from('moradores')
          .update({
            nome: nomeMorador.trim(),
            bloco: blocoMorador.trim(),
            unidade: unidadeMorador.trim(),
            telefone: telefoneMorador.trim(),
            condominio_id: targetCondominioId
          })
          .eq('id', idEdicao);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Morador atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('moradores').insert([
          {
            nome: nomeMorador.trim(),
            bloco: blocoMorador.trim(),
            unidade: unidadeMorador.trim(),
            telefone: telefoneMorador.trim(),
            condominio_id: targetCondominioId
          }
        ]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Morador cadastrado com sucesso!' });
      }

      fecharModalFlutuante();
      carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar morador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoMorador = (m: any) => {
    setIdEdicao(m.id);
    setNomeMorador(m.nome);
    setBlocoMorador(m.bloco || '');
    setUnidadeMorador(m.unidade || '');
    setTelefoneMorador(m.telefone || '');
    setCondominioIdMorador(m.condominio_id || '');
    setTipoModalFlutuante('morador');
    setModalFlutuanteAberto(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Compacto com Nível e Multi-Tenant */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm border border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Nível: {eAdmin ? 'ADMINISTRADOR GERAL' : eMaster ? 'MASTER (SÍNDICO)' : eSupervisor ? 'SUPERVISOR' : 'OPERADOR (PORTARIA)'}
          </span>
          <h3 className="font-bold text-base sm:text-lg mt-1 text-white">
            Cadastros Base do Sistema
          </h3>
          <p className="text-xs text-slate-300">
            {eAdmin 
              ? 'Gerenciamento global de condomínios, equipe operacional e moradores.' 
              : `Condomínio Ativo: ${getNomeCondominioPorId(usuarioLogado?.condominio_id)}`}
          </p>
        </div>

        {eAdmin && (
          <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700 w-full md:w-auto min-w-[260px] space-y-1">
            <label className="block text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrar Condomínio em Gerenciamento
            </label>
            <select
              value={condominioFiltroAdmin}
              onChange={(e) => {
                setCondominioFiltroAdmin(e.target.value);
                setCondominioIdOperador(e.target.value);
                setCondominioIdMorador(e.target.value);
              }}
              className="w-full bg-slate-950 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="">🏢 Todos os Condomínios (Visão Global)</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>🏢 {c.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navegação de Abas Fluida com Contadores */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300 gap-1.5 shadow-2xs">
        {eAdmin && (
          <button
            onClick={() => setAbaAtiva('condominios')}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'condominios'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Condomínios</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
              abaAtiva === 'condominios' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {condominios.length}
            </span>
          </button>
        )}

        {!eOperador && (
          <button
            onClick={() => setAbaAtiva('operadores')}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'operadores'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Operadores</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
              abaAtiva === 'operadores' ? 'bg-slate-800 text-blue-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {operadores.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setAbaAtiva('moradores')}
          className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
            abaAtiva === 'moradores'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Home className="w-4 h-4 text-purple-400" />
          <span>Moradores & Unidades</span>
          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
            abaAtiva === 'moradores' ? 'bg-slate-800 text-purple-300' : 'bg-slate-300 text-slate-700'
          }`}>
            {moradores.length}
          </span>
        </button>
      </div>

      {/* Alertas e Notificações */}
      {mensagem.texto && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* 1. ABA CONDOMÍNIOS (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'condominios' && eAdmin && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca e Botão de Novo Condomínio */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={buscaCondominio}
                onChange={(e) => setBuscaCondominio(e.target.value)}
                placeholder="Buscar condomínio por nome ou endereço..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={abrirNovoCondominio}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Condomínio
            </button>
          </div>

          {/* Grid de Cards dos Condomínios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {condominios
              .filter(c => {
                if (!buscaCondominio.trim()) return true;
                const termo = buscaCondominio.toLowerCase();
                return (c.nome || '').toLowerCase().includes(termo) || (c.endereco || '').toLowerCase().includes(termo);
              })
              .map((c) => {
                const cfg = mapaConfigsCondos[c.id] || {};
                const temGrupo = !!cfg.whatsapp_grupo_url;

                return (
                  <div 
                    key={c.id} 
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Condomínio
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">{c.nome}</h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        📍 {c.endereco || 'Endereço não informado'}
                      </p>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Plantão: <strong>{cfg.escala_label || '06:00 às 18:00 / 18:00 às 06:00'}</strong></span>
                        </div>
                        {cfg.telefone_portaria && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>Portaria: <strong>{cfg.telefone_portaria}</strong></span>
                          </div>
                        )}
                        {cfg.sindico_nome && (
                          <div className="text-[11px] text-slate-500">
                            Síndico(a): <strong>{cfg.sindico_nome}</strong> {cfg.sindico_whatsapp ? `(${cfg.sindico_whatsapp})` : ''}
                          </div>
                        )}
                      </div>

                      {temGrupo && (
                        <a
                          href={cfg.whatsapp_grupo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Grupo WhatsApp do Posto</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setCondominioFiltroAdmin(c.id)}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer"
                      >
                        Filtrar Este
                      </button>

                      <button
                        type="button"
                        onClick={() => prepararEdicaoCondominio(c)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar no Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {condominios.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum condomínio cadastrado ainda.</p>
              <button
                onClick={abrirNovoCondominio}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Condomínio
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ABA OPERADORES (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'operadores' && !eOperador && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca e Botão de Novo Operador */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={buscaOperador}
                onChange={(e) => setBuscaOperador(e.target.value)}
                placeholder="Buscar operador por nome ou login..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={abrirNovoOperador}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> Cadastrar Novo Operador
            </button>
          </div>

          {/* Grid de Cards dos Operadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {operadores
              .filter(op => {
                if (!buscaOperador.trim()) return true;
                const termo = buscaOperador.toLowerCase();
                return (op.nome || '').toLowerCase().includes(termo) || (op.login || '').toLowerCase().includes(termo);
              })
              .map((op) => {
                const nivelStr = op.nivel_acesso === 0 
                  ? 'Admin Geral' 
                  : op.nivel_acesso === 1 
                  ? 'Master (Síndico)' 
                  : op.nivel_acesso === 2 
                  ? 'Supervisor' 
                  : 'Operador Guarita';

                return (
                  <div 
                    key={op.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            op.nivel_acesso === 0 
                              ? 'bg-purple-100 text-purple-900 border-purple-200' 
                              : op.nivel_acesso === 1 
                              ? 'bg-amber-100 text-amber-900 border-amber-200' 
                              : 'bg-blue-100 text-blue-900 border-blue-200'
                          }`}>
                            {nivelStr}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">{op.nome}</h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div>Login de Acesso: <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{op.login}</strong></div>
                        <div className="text-[11px] text-slate-500">
                          🏢 Condomínio: <strong>{getNomeCondominioPorId(op.condominio_id)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => prepararEdicaoOperador(op)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar no Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {operadores.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum operador encontrado.</p>
              <button
                onClick={abrirNovoOperador}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Operador
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. ABA MORADORES (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'moradores' && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca Rápida e Botão de Novo Morador */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={termoBuscaMorador}
                onChange={(e) => {
                  setTermoBuscaMorador(e.target.value);
                }}
                placeholder="Buscar por nome, unidade ou bloco..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="button"
              onClick={abrirNovoMorador}
              className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Morador
            </button>
          </div>

          {/* Grid de Cards dos Moradores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {moradores
              .filter(m => {
                if (!termoBuscaMorador.trim()) return true;
                const termo = termoBuscaMorador.toLowerCase();
                const nm = (m.nome || '').toLowerCase();
                const und = (m.unidade || '').toString().toLowerCase();
                const blc = (m.bloco || '').toLowerCase();
                return nm.includes(termo) || und.includes(termo) || blc.includes(termo);
              })
              .map((m) => {
                const telLimpo = (m.telefone || '').replace(/\D/g, '');

                return (
                  <div 
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-purple-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                            Ap. {m.unidade} {m.bloco ? `• Bloco ${m.bloco}` : ''}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">{m.nome}</h4>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                          Titular
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{m.telefone || 'Telefone não informado'}</span>
                        </div>
                        {eAdmin && (
                          <div className="text-[11px] text-slate-400">
                            🏢 {getNomeCondominioPorId(m.condominio_id)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      {telLimpo ? (
                        <a
                          href={`https://wa.me/55${telLimpo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                      )}

                      <button
                        type="button"
                        onClick={() => prepararEdicaoMorador(m)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar no Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {moradores.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Home className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum morador encontrado com os filtros atuais.</p>
              <button
                onClick={abrirNovoMorador}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Morador
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MENU FLUTUANTE / MODAL DE CADASTRO E EDIÇÃO DIRETAMENTE NO CARD           */}
      {/* ========================================================================= */}
      {modalFlutuanteAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 relative">
            {/* Header do Menu Flutuante */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className={`p-2.5 rounded-2xl ${
                  tipoModalFlutuante === 'condominio' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : tipoModalFlutuante === 'operador' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {tipoModalFlutuante === 'condominio' ? (
                    <Building2 className="w-5 h-5" />
                  ) : tipoModalFlutuante === 'operador' ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Home className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {idEdicao ? (
                      tipoModalFlutuante === 'condominio' 
                        ? `Editar Condomínio: ${nomeCondominio}` 
                        : tipoModalFlutuante === 'operador' 
                        ? `Editar Operador: ${nomeOperador}` 
                        : `Editar Morador: ${nomeMorador}`
                    ) : (
                      tipoModalFlutuante === 'condominio' 
                        ? 'Novo Cadastro de Condomínio' 
                        : tipoModalFlutuante === 'operador' 
                        ? 'Novo Cadastro de Operador' 
                        : 'Novo Cadastro de Morador'
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menu flutuante de edição rápida e parametrização
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModalFlutuante}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORMULÁRIO 1: CONDOMÍNIO */}
            {tipoModalFlutuante === 'condominio' && (
              <form onSubmit={salvarCondominio} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome do Condomínio *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCondominio}
                    onChange={(e) => setNomeCondominio(e.target.value)}
                    placeholder="Ex: Residencial Flores do Bosque"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={enderecoCondominio}
                    onChange={(e) => setEnderecoCondominio(e.target.value)}
                    placeholder="Av. Exemplo, 1234 - Bairro, Cidade/UF"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Escala e Horários */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Escala de Plantão & Horários de Troca
                  </label>
                  <select
                    value={escalaPlantao}
                    onChange={(e: any) => {
                      const nova = e.target.value;
                      setEscalaPlantao(nova);
                      const opt = OPCOES_ESCALA.find(o => o.id === nova);
                      if (opt && nova !== 'personalizado') {
                        setHorarioDiurnoInicio(opt.diurnoInicio);
                        setHorarioNoturnoInicio(opt.noturnoInicio);
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {OPCOES_ESCALA.map((op) => (
                      <option key={op.id} value={op.id}>
                        🕒 {op.label}
                      </option>
                    ))}
                  </select>

                  {escalaPlantao === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Diurno</label>
                        <input
                          type="time"
                          value={horarioDiurnoInicio}
                          onChange={(e) => setHorarioDiurnoInicio(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Noturno</label>
                        <input
                          type="time"
                          value={horarioNoturnoInicio}
                          onChange={(e) => setHorarioNoturnoInicio(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp do Grupo do Posto */}
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Link do Grupo de WhatsApp da Portaria
                  </label>
                  <input
                    type="url"
                    value={whatsappGrupoUrl}
                    onChange={(e) => setWhatsappGrupoUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>

                {/* Telefones de Apoio e Síndico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Telefone Portaria</label>
                    <input
                      type="text"
                      value={telefonePortaria}
                      onChange={(e) => setTelefonePortaria(e.target.value)}
                      placeholder="(11) 98888-0000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome do Síndico</label>
                    <input
                      type="text"
                      value={sindicoNome}
                      onChange={(e) => setSindicoNome(e.target.value)}
                      placeholder="Nome do Síndico"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Condomínio' : 'Salvar Condomínio'}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 2: OPERADOR */}
            {tipoModalFlutuante === 'operador' && (
              <form onSubmit={salvarOperador} className="space-y-3.5">
                {eAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Condomínio Vinculado *
                    </label>
                    <select
                      value={condominioIdOperador}
                      onChange={(e) => setCondominioIdOperador(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione o Condomínio...</option>
                      {condominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo do Operador *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeOperador}
                    onChange={(e) => setNomeOperador(e.target.value)}
                    placeholder="Ex: Marcos Souza Oliveira"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Login de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginOperador}
                      onChange={(e) => setLoginOperador(e.target.value.toLowerCase())}
                      placeholder="marcos.porteiro"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      {idEdicao ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                    </label>
                    <input
                      type="password"
                      required={!idEdicao}
                      value={senhaOperador}
                      onChange={(e) => setSenhaOperador(e.target.value)}
                      placeholder={idEdicao ? 'Deixe em branco para manter' : 'Senha secreta'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nível de Acesso / Perfil *
                  </label>
                  <select
                    value={nivelAcesso}
                    onChange={(e) => setNivelAcesso(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    {eAdmin && <option value="0">Nível 0 — Administrador Geral</option>}
                    <option value="1">Nível 1 — Master (Síndico / Auditoria)</option>
                    <option value="2">Nível 2 — Supervisor de Segurança</option>
                    <option value="3">Nível 3 — Operador de Guarita / Portaria</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Operador' : 'Salvar Operador'}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 3: MORADOR */}
            {tipoModalFlutuante === 'morador' && (
              <form onSubmit={salvarMorador} className="space-y-3.5">
                {eAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Condomínio *
                    </label>
                    <select
                      value={condominioIdMorador}
                      onChange={(e) => setCondominioIdMorador(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Selecione o Condomínio...</option>
                      {condominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo do Morador *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeMorador}
                    onChange={(e) => setNomeMorador(e.target.value)}
                    placeholder="Ex: Carlos Eduardo da Silva"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Bloco (Opcional)
                    </label>
                    <input
                      type="text"
                      value={blocoMorador}
                      onChange={(e) => setBlocoMorador(e.target.value)}
                      placeholder="Ex: Bloco A"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Unidade / Apartamento *
                    </label>
                    <input
                      type="text"
                      required
                      value={unidadeMorador}
                      onChange={(e) => setUnidadeMorador(e.target.value)}
                      placeholder="Ex: 101"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefoneMorador}
                    onChange={(e) => setTelefoneMorador(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Morador' : 'Salvar Morador'}
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
