import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Building2, Users, UserPlus, Home, Plus, Search, CheckCircle, AlertCircle, Pencil, X } from 'lucide-react';

export default function Cadastros({ usuarioLogado }) {
  const [abaAtiva, setAbaAtiva] = useState('condominios');
  const [condominios, setCondominios] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [moradores, setMoradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Controle de edição
  const [idEdicao, setIdEdicao] = useState(null);

  // Formulário Condomínio
  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');

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

  // Busca rápida de moradores
  const [termoBuscaMorador, setTermoBuscaMorador] = useState('');

  useEffect(() => {
    limparFormularios();
    carregarDados();
  }, [abaAtiva]);

  const limparFormularios = () => {
    setIdEdicao(null);
    setNomeCondominio('');
    setEnderecoCondominio('');
    setNomeOperador('');
    setLoginOperador('');
    setSenhaOperador('');
    setNivelAcesso('3');
    setCondominioIdOperador('');
    setNomeMorador('');
    setBlocoMorador('');
    setUnidadeMorador('');
    setTelefoneMorador('');
    setCondominioIdMorador('');
  };

  const carregarDados = async () => {
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      if (abaAtiva === 'condominios') {
        const { data, error } = await supabase.from('condominios').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setCondominios(data || []);
      } else if (abaAtiva === 'operadores') {
        const { data: conds } = await supabase.from('condominios').select('*');
        setCondominios(conds || []);

        const { data, error } = await supabase.from('operadores').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setOperadores(data || []);
      } else if (abaAtiva === 'moradores') {
        const { data: conds } = await supabase.from('condominios').select('*');
        setCondominios(conds || []);

        let query = supabase.from('moradores').select('*').order('nome', { ascending: true });
        if (termoBuscaMorador) {
          query = query.ilike('nome', `%${termoBuscaMorador}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setMoradores(data || []);
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao carregar dados: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Salvar ou Editar Condomínio
  const salvarCondominio = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoCondominio = (c) => {
    setIdEdicao(c.id);
    setNomeCondominio(c.nome);
    setEnderecoCondominio(c.endereco || '');
  };

  // Salvar ou Editar Operador
  const salvarOperador = async (e) => {
    e.preventDefault();
    if (!nomeOperador.trim() || !loginOperador.trim() || !condominioIdOperador) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos obrigatórios do operador.' });
      return;
    }
    setLoading(true);

    try {
      if (idEdicao) {
        const dadosAtualizacao = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim(),
          nivel_acesso: parseInt(nivelAcesso),
          condominio_id: condominioIdOperador
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
            login: loginOperador.trim(),
            senha: senhaOperador.trim(),
            nivel_acesso: parseInt(nivelAcesso),
            condominio_id: condominioIdOperador,
            ativo: true
          }
        ]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador cadastrado com sucesso!' });
      }

      limparFormularios();
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar operador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoOperador = (op) => {
    setIdEdicao(op.id);
    setNomeOperador(op.nome);
    setLoginOperador(op.login);
    setSenhaOperador('');
    setNivelAcesso(String(op.nivel_acesso));
    setCondominioIdOperador(op.condominio_id || '');
  };

  // Salvar ou Editar Morador
  const salvarMorador = async (e) => {
    e.preventDefault();
    if (!nomeMorador.trim() || !unidadeMorador.trim() || !condominioIdMorador) {
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
            condominio_id: condominioIdMorador
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
            condominio_id: condominioIdMorador
          }
        ]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Morador cadastrado com sucesso!' });
      }

      limparFormularios();
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar morador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoMorador = (m) => {
    setIdEdicao(m.id);
    setNomeMorador(m.nome);
    setBlocoMorador(m.bloco || '');
    setUnidadeMorador(m.unidade || '');
    setTelefoneMorador(m.telefone || '');
    setCondominioIdMorador(m.condominio_id || '');
  };

  return (
    <div className="space-y-6">
      {/* Abas de Navegação */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setAbaAtiva('condominios')}
          className={`flex-1 py-4 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
            abaAtiva === 'condominios'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Condomínios
        </button>

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

      {/* ABA CONDOMÍNIOS */}
      {abaAtiva === 'condominios' && (
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
            <h3 className="font-bold text-slate-800 mb-4">Condomínios Cadastrados</h3>
            <div className="space-y-3">
              {condominios.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">{c.nome}</h4>
                    <p className="text-xs text-slate-500">{c.endereco || 'Sem endereço informado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
      {abaAtiva === 'operadores' && (
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
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Condomínio</label>
              <select
                value={condominioIdOperador}
                onChange={(e) => setCondominioIdOperador(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                required
              >
                <option value="">Selecione...</option>
                {condominios.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Login de Acesso</label>
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
                {idEdicao ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nível de Acesso</label>
              <select
                value={nivelAcesso}
                onChange={(e) => setNivelAcesso(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="1">Nível 1 - Master (Síndico)</option>
                <option value="2">Nível 2 - Supervisor</option>
                <option value="3">Nível 3 - Operador (Portaria)</option>
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
            <h3 className="font-bold text-slate-800 mb-4">Operadores do Sistema</h3>
            <div className="space-y-3">
              {operadores.map((op) => (
                <div key={op.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">{op.nome}</h4>
                    <p className="text-xs text-slate-500">Login: {op.login} | Nível: {op.nivel_acesso}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => prepararEdicaoOperador(op)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
                      {op.nivel_acesso === 0 ? 'Dev Admin' : `Nível ${op.nivel_acesso}`}
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
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Condomínio</label>
              <select
                value={condominioIdMorador}
                onChange={(e) => setCondominioIdMorador(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                required
              >
                <option value="">Selecione...</option>
                {condominios.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Morador</label>
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / Ap</label>
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Moradores Cadastrados</h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={termoBuscaMorador}
                  onChange={(e) => setTermoBuscaMorador(e.target.value)}
                  onKeyUp={carregarDados}
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
