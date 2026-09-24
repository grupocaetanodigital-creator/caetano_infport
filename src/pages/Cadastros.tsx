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
  ShieldCheck
} from 'lucide-react';

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
  const [operadores, setOperadores] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');

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
      setCondominios(conds || []);

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
      if (idEdicao) {
        const { error } = await supabase
          .from('condominios')
          .update({ nome: nomeCondominio.trim(), endereco: enderecoCondominio.trim() })
          .eq('id', idEdicao);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Condomínio atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('condominios').insert([
          { nome: nomeCondominio.trim(), endereco: enderecoCondominio.trim() }
        ]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Condomínio cadastrado com sucesso!' });
      }

      limparFormularios();
      carregarDados();
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
    <div className="space-y-6">
      {/* Banner Informativo */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <ShieldCheck className="w-3.5 h-3.5" /> Nível de Acesso: {eAdmin ? 'ADMINISTRADOR GERAL (DEV)' : eMaster ? 'MASTER (SÍNDICO)' : eSupervisor ? 'SUPERVISOR' : 'OPERADOR (PORTARIA)'}
          </span>
          <h3 className="font-bold text-lg mt-1">
            {usuarioLogado?.nome || 'Usuário Conectado'}
          </h3>
          <p className="text-xs text-slate-300">
            {eAdmin 
              ? 'Painel Multi-Tenant Ativo: Selecione o condomínio para alternar o gerenciamento.' 
              : `Condomínio Vinculado: ${getNomeCondominioPorId(usuarioLogado?.condominio_id)}`}
          </p>
        </div>

        {eAdmin && (
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 w-full md:w-auto min-w-[280px] space-y-1">
            <label className="block text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> Condomínio em Gerenciamento
            </label>
            <select
              value={condominioFiltroAdmin}
              onChange={(e) => {
                setCondominioFiltroAdmin(e.target.value);
                setCondominioIdOperador(e.target.value);
                setCondominioIdMorador(e.target.value);
              }}
              className="w-full bg-slate-900 text-white text-xs font-bold p-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="">🏢 Todos os Condomínios (Visão Global)</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>🏢 {c.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        {eAdmin && (
          <button
            onClick={() => setAbaAtiva('condominios')}
            className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              abaAtiva === 'condominios'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Condomínios (ADM)
          </button>
        )}

        {!eOperador && (
          <button
            onClick={() => setAbaAtiva('operadores')}
            className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              abaAtiva === 'operadores'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-5 h-5" />
            Operadores / Guarita
          </button>
        )}

        <button
          onClick={() => setAbaAtiva('moradores')}
          className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
            abaAtiva === 'moradores'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          Moradores e Unidades
        </button>
      </div>

      {/* Alertas */}
      {mensagem.texto && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensagem.texto}
        </div>
      )}

      {/* ABA CONDOMÍNIOS (EXCLUSIVO ADM) */}
      {abaAtiva === 'condominios' && eAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={salvarCondominio} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                {idEdicao ? 'Editar Condomínio' : 'Cadastrar Condomínio'}
              </span>
              {idEdicao && (
                <button
                  type="button"
                  onClick={limparFormularios}
                  className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              )}
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Condomínio</label>
              <input
                type="text"
                required
                value={nomeCondominio}
                onChange={(e) => setNomeCondominio(e.target.value)}
                placeholder="Ex: Residencial Flores"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Endereço</label>
              <input
                type="text"
                value={enderecoCondominio}
                onChange={(e) => setEnderecoCondominio(e.target.value)}
                placeholder="Rua, Número, Bairro"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition"
            >
              {idEdicao ? 'Atualizar Condomínio' : 'Salvar Condomínio'}
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Condomínios Cadastrados ({condominios.length})</h3>
            <div className="space-y-3">
              {condominios.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">{c.nome}</h4>
                    <p className="text-xs text-slate-500">{c.endereco || 'Sem endereço informado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCondominioFiltroAdmin(c.id)}
                      className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
                      title="Alternar para este Condomínio"
                    >
                      Gerenciar
                    </button>
                    <button
                      onClick={() => prepararEdicaoCondominio(c)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                      Ativo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA OPERADORES */}
      {abaAtiva === 'operadores' && !eOperador && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={salvarOperador} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                {idEdicao ? 'Editar Operador' : 'Novo Operador'}
              </span>
              {idEdicao && (
                <button
                  type="button"
                  onClick={limparFormularios}
                  className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              )}
            </h3>

            {eAdmin ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Condomínio *</label>
                <select
                  value={condominioIdOperador}
                  onChange={(e) => setCondominioIdOperador(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  required
                >
                  <option value="">Selecione o Condomínio...</option>
                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                Condomínio: {getNomeCondominioPorId(usuarioLogado?.condominio_id)}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={nomeOperador}
                onChange={(e) => setNomeOperador(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Login de Acesso *</label>
              <input
                type="text"
                required
                value={loginOperador}
                onChange={(e) => setLoginOperador(e.target.value)}
                placeholder="Ex: portaria1"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {idEdicao ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
              </label>
              <input
                type="password"
                required={!idEdicao}
                value={senhaOperador}
                onChange={(e) => setSenhaOperador(e.target.value)}
                placeholder={idEdicao ? '******' : 'Sua senha'}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nível de Acesso *</label>
              <select
                value={nivelAcesso}
                onChange={(e) => setNivelAcesso(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              >
                <option value="3">Nível 3 - Operador (Portaria)</option>
                <option value="2">Nível 2 - Supervisor</option>
                {eAdmin && <option value="1">Nível 1 - Master (Síndico)</option>}
                {eAdmin && <option value="0">Nível 0 - Administrador Dev</option>}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition"
            >
              {idEdicao ? 'Atualizar Operador' : 'Salvar Operador'}
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">
              Operadores Registrados ({operadores.length})
              {condominioFiltroAdmin && <span className="text-xs font-normal text-emerald-600 block">Filtrado por: {getNomeCondominioPorId(condominioFiltroAdmin)}</span>}
            </h3>
            <div className="space-y-3">
              {operadores.map((op) => (
                <div key={op.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">{op.nome}</h4>
                    <p className="text-xs text-slate-500">Login: <strong>{op.login}</strong></p>
                    {eAdmin && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1 inline-block">
                        🏢 {getNomeCondominioPorId(op.condominio_id)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => prepararEdicaoOperador(op)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      op.nivel_acesso === 0 ? 'bg-purple-100 text-purple-800' :
                      op.nivel_acesso === 1 ? 'bg-indigo-100 text-indigo-800' :
                      op.nivel_acesso === 2 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {op.nivel_acesso === 0 ? 'Dev Admin' : op.nivel_acesso === 1 ? 'Master' : op.nivel_acesso === 2 ? 'Supervisor' : 'Operador'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={salvarMorador} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                {idEdicao ? 'Editar Morador' : 'Cadastrar Morador'}
              </span>
              {idEdicao && (
                <button
                  type="button"
                  onClick={limparFormularios}
                  className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              )}
            </h3>

            {eAdmin ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Condomínio *</label>
                <select
                  value={condominioIdMorador}
                  onChange={(e) => setCondominioIdMorador(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  required
                >
                  <option value="">Selecione o Condomínio...</option>
                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                Condomínio: {getNomeCondominioPorId(usuarioLogado?.condominio_id)}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Morador *</label>
              <input
                type="text"
                required
                value={nomeMorador}
                onChange={(e) => setNomeMorador(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco</label>
                <input
                  type="text"
                  value={blocoMorador}
                  onChange={(e) => setBlocoMorador(e.target.value)}
                  placeholder="Bloco A"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Ap *</label>
                <input
                  type="text"
                  required
                  value={unidadeMorador}
                  onChange={(e) => setUnidadeMorador(e.target.value)}
                  placeholder="101"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefoneMorador}
                onChange={(e) => setTelefoneMorador(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition"
            >
              {idEdicao ? 'Atualizar Morador' : 'Salvar Morador'}
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Moradores Cadastrados ({moradores.length})</h3>
                {condominioFiltroAdmin && <span className="text-xs font-normal text-emerald-600 block">Filtrado por: {getNomeCondominioPorId(condominioFiltroAdmin)}</span>}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={termoBuscaMorador}
                  onChange={(e) => {
                    setTermoBuscaMorador(e.target.value);
                    carregarDados();
                  }}
                  placeholder="Buscar por nome..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              {moradores.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Nenhum morador encontrado.</p>
              ) : (
                moradores.map((m) => (
                  <div key={m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">{m.nome}</h4>
                      <p className="text-xs text-slate-500">
                        {m.bloco ? `Bloco ${m.bloco} - ` : ''}Unidade {m.unidade} | Tel: {m.telefone || 'Não informado'}
                      </p>
                      {eAdmin && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1 inline-block">
                          🏢 {getNomeCondominioPorId(m.condominio_id)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => prepararEdicaoMorador(m)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
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
