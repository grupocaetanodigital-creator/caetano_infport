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
  Phone
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

  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');
  const [escalaPlantao, setEscalaPlantao] = useState<'06_18' | '07_19' | '08_20' | 'personalizado'>('06_18');
  const [horarioDiurnoInicio, setHorarioDiurnoInicio] = useState('06:00');
  const [horarioNoturnoInicio, setHorarioNoturnoInicio] = useState('18:00');
  const [whatsappGrupoUrl, setWhatsappGrupoUrl] = useState('');
  const [telefonePortaria, setTelefonePortaria] = useState('');
  const [sindicoNome, setSindicoNome] = useState('');
  const [sindicoWhatsapp, setSindicoWhatsapp] = useState('');

  const [nomeOperador, setNomeOperador] = useState('');
  const [loginOperador, setLoginOperador] = useState('');
  const [senhaOperador, setSenhaOperador] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('3');
  const [condominioIdOperador, setCondominioIdOperador] = useState('');

  const [nomeMorador, setNomeMorador] = useState('');
  const [blocoMorador, setBlocoMorador] = useState('');
  const [unidadeMorador, setUnidadeMorador] = useState('');
  const [telefoneMorador, setTelefoneMorador] = useState('');
  const [condominioIdMorador, setCondominioIdMorador] = useState('');

  const [termoBuscaMorador, setTermoBuscaMorador] = useState('');

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

  const carregarDados = async () => {
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      let queryCond = supabase.from('condominios').select('*').order('created_at', { ascending: false });
      if (!eAdmin && usuarioLogado?.condominio_id) {
        queryCond = queryCond.eq('id', usuarioLogado.condominio_id);
      }
      const { data: conds, error: errCond } = await queryCond;
      if (errCond) throw errCond;
      const listaCondos = conds || [];
      setCondominios(listaCondos);

      // Carregar configurações de cada condomínio (escala de plantão, grupo whatsapp, etc.)
      const mapaTemp: Record<string, CondominioConfig> = {};
      await Promise.all(
        listaCondos.map(async (c) => {
          const cfg = await carregarCondominioConfig(c.id);
          mapaTemp[c.id] = cfg;
        })
      );
      setMapaConfigsCondos(mapaTemp);

      if (abaAtiva === 'operadores' && !eOperador) {
        let queryOp = supabase.from('operadores').select('*').order('created_at', { ascending: false });
        
        if (eAdmin && condominioFiltroAdmin) {
          queryOp = queryOp.eq('condominio_id', condominioFiltroAdmin);
        } else if (!eAdmin && usuarioLogado?.condominio_id) {
          queryOp = queryOp.eq('condominio_id', usuarioLogado.condominio_id);
        }

        const { data: ops, error: errOp } = await queryOp;
        if (errOp) throw errOp;

        const operadoresExibidos = !eAdmin
          ? (ops || []).filter(op => op.nivel_acesso !== 0 && op.perfil !== 'admin')
          : (ops || []);

        setOperadores(operadoresExibidos);
      }

      if (abaAtiva === 'moradores') {
        let queryMor = supabase.from('moradores').select('*').order('nome', { ascending: true });
        
        if (eAdmin && condominioFiltroAdmin) {
          queryMor = queryMor.eq('condominio_id', condominioFiltroAdmin);
        } else if (!eAdmin && usuarioLogado?.condominio_id) {
          queryMor = queryMor.eq('condominio_id', usuarioLogado.condominio_id);
        }

        if (termoBuscaMorador.trim()) {
          queryMor = queryMor.ilike('nome', `%${termoBuscaMorador.trim()}%`);
        }

        const { data: mors, error: errMor } = await queryMor;
        if (errMor) throw errMor;
        setMoradores(mors || []);
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao carregar dados: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const getNomeCondominioPorId = (id: string) => {
    const cond = condominios.find(c => c.id === id);
    return cond ? cond.nome : 'Geral / Não Definido';
  };

  const salvarCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eAdmin) {
      setMensagem({ tipo: 'erro', texto: 'Apenas o Administrador Geral pode cadastrar ou alterar condomínios.' });
      return;
    }
    if (!nomeCondominio.trim()) return;
    setLoading(true);

    try {
      let targetId = idEdicao;
      const optEscala = OPCOES_ESCALA.find(o => o.id === escalaPlantao);
      const escalaLabel = optEscala ? optEscala.label : 'Personalizado';

      const configCondo = {
        nome: nomeCondominio.trim(),
        endereco: enderecoCondominio.trim(),
        escala_plantao: escalaPlantao,
        escala_label: escalaLabel,
        horario_diurno_inicio: escalaPlantao === 'personalizado' ? horarioDiurnoInicio : (optEscala?.diurnoInicio || '06:00'),
        horario_noturno_inicio: escalaPlantao === 'personalizado' ? horarioNoturnoInicio : (optEscala?.noturnoInicio || '18:00'),
        whatsapp_grupo_url: whatsappGrupoUrl.trim(),
        telefone_portaria: telefonePortaria.trim(),
        sindico_nome: sindicoNome.trim(),
        sindico_whatsapp: sindicoWhatsapp.trim()
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
        await salvarCondominioConfig(novoCond.id, configCondo);
        setMensagem({ tipo: 'sucesso', texto: 'Condomínio e configurações cadastrados com sucesso!' });
      }

      limparFormularios();
      await carregarDados();
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

      limparFormularios();
      carregarDados();
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

      limparFormularios();
      carregarDados();
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
  };

  return (
    <div className="space-y-3">
      {/* Header Compacto */}
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shadow-2xs border border-slate-800">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
            <ShieldCheck className="w-3 h-3" /> Nível: {eAdmin ? 'ADMINISTRADOR GERAL' : eMaster ? 'MASTER (SÍNDICO)' : eSupervisor ? 'SUPERVISOR' : 'OPERADOR (PORTARIA)'}
          </span>
          <h3 className="font-bold text-sm sm:text-base mt-0.5">
            {usuarioLogado?.nome || 'Usuário Conectado'}
          </h3>
          <p className="text-[11px] text-slate-300">
            {eAdmin 
              ? 'Multi-Tenant: Selecione o condomínio para alternar o gerenciamento.' 
              : `Condomínio: ${getNomeCondominioPorId(usuarioLogado?.condominio_id)}`}
          </p>
        </div>

        {eAdmin && (
          <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 w-full md:w-auto min-w-[240px] space-y-0.5">
            <label className="block text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Condomínio em Gerenciamento
            </label>
            <select
              value={condominioFiltroAdmin}
              onChange={(e) => {
                setCondominioFiltroAdmin(e.target.value);
                setCondominioIdOperador(e.target.value);
                setCondominioIdMorador(e.target.value);
              }}
              className="w-full bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="">🏢 Todos os Condomínios (Visão Global)</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>🏢 {c.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Abas Compactas */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1">
        {eAdmin && (
          <button
            onClick={() => setAbaAtiva('condominios')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md transition ${
              abaAtiva === 'condominios'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Condomínios
          </button>
        )}

        {!eOperador && (
          <button
            onClick={() => setAbaAtiva('operadores')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md transition ${
              abaAtiva === 'operadores'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Operadores
          </button>
        )}

        <button
          onClick={() => setAbaAtiva('moradores')}
          className={`flex-1 py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md transition ${
            abaAtiva === 'moradores'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Moradores e Unidades
        </button>
      </div>

      {/* Alertas */}
      {mensagem.texto && (
        <div
          className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* ABA CONDOMÍNIOS (EXCLUSIVO ADM) */}
      {abaAtiva === 'condominios' && eAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          <form onSubmit={salvarCondominio} className="bg-white p-3 sm:p-3.5 rounded-xl shadow-2xs border border-slate-200 space-y-2.5">
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                {idEdicao ? 'Editar Condomínio' : 'Cadastrar Condomínio'}
              </span>
              {idEdicao && (
                <button
                  type="button"
                  onClick={limparFormularios}
                  className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-0.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
              )}
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Nome do Condomínio *</label>
              <input
                type="text"
                required
                value={nomeCondominio}
                onChange={(e) => setNomeCondominio(e.target.value)}
                placeholder="Ex: Residencial Flores"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Endereço</label>
              <input
                type="text"
                value={enderecoCondominio}
                onChange={(e) => setEnderecoCondominio(e.target.value)}
                placeholder="Rua, Número, Bairro"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>

            {/* SEÇÃO DE CONFIGURAÇÃO DE PLANTÃO */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Escala & Horários do Plantão *
              </label>

              <div>
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
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {OPCOES_ESCALA.map((op) => (
                    <option key={op.id} value={op.id}>
                      🕒 {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {escalaPlantao === 'personalizado' && (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Diurno</label>
                    <input
                      type="time"
                      value={horarioDiurnoInicio}
                      onChange={(e) => setHorarioDiurnoInicio(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Noturno</label>
                    <input
                      type="time"
                      value={horarioNoturnoInicio}
                      onChange={(e) => setHorarioNoturnoInicio(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                ✓ Turno 1: <strong>{horarioDiurnoInicio}</strong> às <strong>{horarioNoturnoInicio}</strong> | Turno 2: <strong>{horarioNoturnoInicio}</strong> às <strong>{horarioDiurnoInicio}</strong>
              </div>
            </div>

            {/* SEÇÃO DE GRUPO WHATSAPP */}
            <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                Link do Grupo de WhatsApp
              </label>

              <div className="relative">
                <input
                  type="url"
                  value={whatsappGrupoUrl}
                  onChange={(e) => setWhatsappGrupoUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 font-mono"
                />
              </div>

              {whatsappGrupoUrl.trim() && (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-emerald-700 font-medium truncate max-w-[150px]">
                    Link configurado
                  </span>
                  <a
                    href={whatsappGrupoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-0.5 underline"
                  >
                    <ExternalLink className="w-2.5 h-2.5" /> Testar Link
                  </a>
                </div>
              )}
            </div>

            {/* CONTATOS COMPLEMENTARES */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Contatos de Apoio:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Telefone Portaria</label>
                  <input
                    type="text"
                    value={telefonePortaria}
                    onChange={(e) => setTelefonePortaria(e.target.value)}
                    placeholder="(11) 98888-0000"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 mb-0.5">Nome do Síndico</label>
                  <input
                    type="text"
                    value={sindicoNome}
                    onChange={(e) => setSindicoNome(e.target.value)}
                    placeholder="Nome do Síndico"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg hover:bg-slate-800 transition text-xs flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {loading ? 'Salvando...' : idEdicao ? 'Atualizar Condomínio' : 'Salvar Novo Condomínio'}
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-700" />
                Condomínios Gerenciados ({condominios.length})
              </h3>
              <span className="text-[11px] text-slate-400">Escalas & WhatsApp</span>
            </div>

            <div className="space-y-2">
              {condominios.map((c) => {
                const cfg = mapaConfigsCondos[c.id] || {};
                const temGrupo = !!cfg.whatsapp_grupo_url;

                return (
                  <div key={c.id} className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:border-slate-300 transition shadow-2xs">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{c.nome}</h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                          Ativo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{c.endereco || 'Sem endereço informado'}</p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                        <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          Plantão: <strong>{cfg.escala_label || '06:00 às 18:00 / 18:00 às 06:00'}</strong>
                        </span>

                        {temGrupo ? (
                          <a
                            href={cfg.whatsapp_grupo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-emerald-100 transition"
                            title="Abrir Grupo do WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            WhatsApp
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[9px]">
                            ⚠️ Sem Grupo
                          </span>
                        )}

                        {cfg.telefone_portaria && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Phone className="w-2.5 h-2.5" /> {cfg.telefone_portaria}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => setCondominioFiltroAdmin(c.id)}
                        className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
                        title="Alternar para este Condomínio"
                      >
                        Gerenciar
                      </button>
                      <button
                        onClick={() => prepararEdicaoCondominio(c)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {condominios.length === 0 && (
                <div className="text-center p-6 text-slate-400 text-xs italic">
                  Nenhum condomínio cadastrado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA OPERADORES */}
      {abaAtiva === 'operadores' && !eOperador && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          <form onSubmit={salvarOperador} className="bg-white p-3 sm:p-3.5 rounded-xl shadow-2xs border border-slate-200 space-y-2.5">
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                {idEdicao ? 'Editar Operador' : 'Novo Operador'}
              </span>
              {idEdicao && (
                <button
                  type="button"
                  onClick={limparFormularios}
                  className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-0.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
              )}
            </h3>

            {eAdmin ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Condomínio *</label>
                <select
                  value={condominioIdOperador}
                  onChange={(e) => setCondominioIdOperador(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-medium"
                  required
                >
                  <option value="">Selecione o Condomínio...</option>
                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                Condomínio: {getNomeCondominioPorId(usuarioLogado?.condominio_id)}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Nome Completo *</label>
              <input
                type="text"
                required
                value={nomeOperador}
                onChange={(e) => setNomeOperador(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Login de Acesso *</label>
              <input
                type="text"
                required
                value={loginOperador}
                onChange={(e) => setLoginOperador(e.target.value)}
                placeholder="Ex: portaria1"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                {idEdicao ? 'Nova Senha (opcional)' : 'Senha *'}
              </label>
              <input
                type="password"
                required={!idEdicao}
                value={senhaOperador}
                onChange={(e) => setSenhaOperador(e.target.value)}
                placeholder={idEdicao ? '******' : 'Sua senha'}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Nível de Acesso *</label>
              <select
                value={nivelAcesso}
                onChange={(e) => setNivelAcesso(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold"
              >
                <option value="3">Nível 3 - Operador (Portaria)</option>
                <option value="2">Nível 2 - Supervisor</option>
                <option value="4">Nível 4 - Síndico (Consulta Exclusiva / Somente Leitura)</option>
                {eAdmin && <option value="1">Nível 1 - Master</option>}
                {eAdmin && <option value="0">Nível 0 - Administrador Dev</option>}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg hover:bg-slate-800 transition text-xs shadow-2xs"
            >
              {idEdicao ? 'Atualizar Operador' : 'Salvar Operador'}
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-3 border-b pb-2">
              Operadores Registrados ({operadores.length})
              {condominioFiltroAdmin && <span className="text-[11px] font-normal text-emerald-600 block">Filtrado por: {getNomeCondominioPorId(condominioFiltroAdmin)}</span>}
            </h3>
            <div className="space-y-2">
              {operadores.map((op) => (
                <div key={op.id} className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center shadow-2xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{op.nome}</h4>
                    <p className="text-[11px] text-slate-500">Login: <strong>{op.login}</strong></p>
                    {eAdmin && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        🏢 {getNomeCondominioPorId(op.condominio_id)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => prepararEdicaoOperador(op)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      op.nivel_acesso === 0 ? 'bg-purple-100 text-purple-800' :
                      op.nivel_acesso === 1 ? 'bg-indigo-100 text-indigo-800' :
                      op.nivel_acesso === 2 ? 'bg-amber-100 text-amber-800' :
                      op.nivel_acesso === 4 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {op.nivel_acesso === 0 ? 'Dev Admin' : op.nivel_acesso === 1 ? 'Master' : op.nivel_acesso === 2 ? 'Supervisor' : op.nivel_acesso === 4 ? '🛡️ Síndico (Consulta)' : 'Operador'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA MORADORES */}
      {abaAtiva === 'moradores' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          <form onSubmit={salvarMorador} className="bg-white p-3 sm:p-3.5 rounded-xl shadow-2xs border border-slate-200 space-y-2.5">
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                {idEdicao ? 'Editar Morador' : 'Cadastrar Morador'}
              </span>
              {idEdicao && (
                <button
                  type="button"
                  onClick={limparFormularios}
                  className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-0.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
              )}
            </h3>

            {eAdmin ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Condomínio *</label>
                <select
                  value={condominioIdMorador}
                  onChange={(e) => setCondominioIdMorador(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-medium"
                  required
                >
                  <option value="">Selecione o Condomínio...</option>
                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                Condomínio: {getNomeCondominioPorId(usuarioLogado?.condominio_id)}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Nome do Morador *</label>
              <input
                type="text"
                required
                value={nomeMorador}
                onChange={(e) => setNomeMorador(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Bloco</label>
                <input
                  type="text"
                  value={blocoMorador}
                  onChange={(e) => setBlocoMorador(e.target.value)}
                  placeholder="Bloco A"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Unidade / Ap *</label>
                <input
                  type="text"
                  required
                  value={unidadeMorador}
                  onChange={(e) => setUnidadeMorador(e.target.value)}
                  placeholder="101"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefoneMorador}
                onChange={(e) => setTelefoneMorador(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg hover:bg-slate-800 transition text-xs shadow-2xs"
            >
              {idEdicao ? 'Atualizar Morador' : 'Salvar Morador'}
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 border-b pb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Moradores Cadastrados ({moradores.length})</h3>
                {condominioFiltroAdmin && <span className="text-[11px] font-normal text-emerald-600 block">Filtrado por: {getNomeCondominioPorId(condominioFiltroAdmin)}</span>}
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={termoBuscaMorador}
                  onChange={(e) => {
                    setTermoBuscaMorador(e.target.value);
                    carregarDados();
                  }}
                  placeholder="Buscar por nome..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              {moradores.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 italic">Nenhum morador encontrado.</p>
              ) : (
                moradores.map((m) => (
                  <div key={m.id} className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center shadow-2xs">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{m.nome}</h4>
                      <p className="text-[11px] text-slate-500">
                        {m.bloco ? `Bloco ${m.bloco} - ` : ''}Unidade {m.unidade} | Tel: {m.telefone || 'Não informado'}
                      </p>
                      {eAdmin && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          🏢 {getNomeCondominioPorId(m.condominio_id)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => prepararEdicaoMorador(m)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
