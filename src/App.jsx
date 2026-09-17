import React, { useState } from 'react';
import { supabase } from './services/supabase';
import Cadastros from './pages/Cadastros';
import Encomendas from './pages/Encomendas';
import Custodia from './pages/Custodia';
import Materiais from './pages/Materiais';
import Chaves from './pages/Chaves';
import Manutencao from './pages/Manutencao';
import { ShieldCheck, Lock, User, LogOut, Building2, Database, Package, Shield, Radio, Key, Wrench } from 'lucide-react';

export default function App() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState(null);
  const [condominio, setCondominio] = useState(null);
  const [moduloAtual, setModuloAtual] = useState('encomendas'); // 'encomendas', 'custodia', 'materiais', 'chaves', 'manutencao', 'cadastros'
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const loginLimpo = login.trim();
      const senhaLimpa = senha.trim();

      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('login', loginLimpo)
        .eq('senha', senhaLimpa)
        .eq('ativo', true)
        .maybeSingle();

      if (opError) throw opError;
      if (!opData) {
        setErro('Usuário ou senha incorretos.');
        setLoading(false);
        return;
      }

      let condData = null;
      if (opData.condominio_id) {
        const { data: cData } = await supabase
          .from('condominios')
          .select('*')
          .eq('id', opData.condominio_id)
          .maybeSingle();
        condData = cData;
      }

      setOperador(opData);
      setCondominio(condData || { nome: 'Administração Geral Dev' });
    } catch (err) {
      setErro(`Falha de conexão: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setOperador(null);
    setCondominio(null);
    setLogin('');
    setSenha('');
  };

  if (operador) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* Cabeçalho */}
        <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                INFPORT 1.0 <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" /> {condominio?.nome || 'Condomínio Geral'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-300 hidden sm:inline">
              Operador: <strong>{operador.nome}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Trocar Turno
            </button>
          </div>
        </header>

        {/* Menu de Módulos / Navegação */}
        <div className="bg-white border-b border-slate-200 shadow-sm overflow-x-auto">
          <div className="max-w-7xl mx-auto flex gap-2 p-2 min-w-max">
            <button
              onClick={() => setModuloAtual('encomendas')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'encomendas'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              Encomendas & Entregadores
            </button>

            <button
              onClick={() => setModuloAtual('custodia')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'custodia'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              Custódia de Itens
            </button>

            <button
              onClick={() => setModuloAtual('materiais')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'materiais'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Radio className="w-4 h-4" />
              Materiais do Posto
            </button>

            <button
              onClick={() => setModuloAtual('chaves')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'chaves'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Key className="w-4 h-4" />
              Quadro de Chaves
            </button>

            <button
              onClick={() => setModuloAtual('manutencao')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'manutencao'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Manutenção & OS
            </button>

            <button
              onClick={() => setModuloAtual('cadastros')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'cadastros'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Database className="w-4 h-4" />
              Cadastro Base
            </button>
          </div>
        </div>

        {/* Conteúdo do Módulo Ativo */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {moduloAtual === 'encomendas' && <Encomendas usuarioLogado={operador} />}
          {moduloAtual === 'custodia' && <Custodia usuarioLogado={operador} />}
          {moduloAtual === 'materiais' && <Materiais usuarioLogado={operador} />}
          {moduloAtual === 'chaves' && <Chaves usuarioLogado={operador} />}
          {moduloAtual === 'manutencao' && <Manutencao usuarioLogado={operador} />}
          {moduloAtual === 'cadastros' && <Cadastros usuarioLogado={operador} />}
        </main>

        {/* Rodapé */}
        <footer className="bg-slate-900 text-slate-500 text-[11px] py-3 text-center border-t border-slate-800">
          INFPORT 1.0 — Gestão de Portaria Inteligente
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-10 h-10 text-slate-800" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">INFPORT 1.0</h1>
          <p className="text-sm text-slate-500">Acesso à Guarita / Operação</p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200 break-words">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Usuário / Login
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full p-3 pl-10 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-md active:scale-[0.98] disabled:opacity-50 text-base mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
