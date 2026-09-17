import React, { useState } from 'react';
import { supabase } from './services/supabase';
import { ShieldCheck, Lock, User, LogOut, Building2 } from 'lucide-react';

export default function App() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState(null);
  const [condominio, setCondominio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // Busca o operador pelo login e senha
      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('login', login)
        .eq('senha', senha)
        .eq('ativo', true)
        .single();

      if (opError || !opData) {
        setErro('Login ou senha inválidos.');
        setLoading(false);
        return;
      }

      // Busca os dados do condomínio associado
      const { data: condData, error: condError } = await supabase
        .from('condominios')
        .select('*')
        .eq('id', opData.condominio_id)
        .single();

      if (condError && opData.nivel_acesso !== 0) {
        setErro('Erro ao carregar dados do condomínio.');
        setLoading(false);
        return;
      }

      setOperador(opData);
      setCondominio(condData || { nome: 'Administração Geral Dev' });
    } catch (err) {
      setErro('Falha ao conectar com o servidor.');
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
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {/* Cabeçalho do App */}
        <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg leading-tight">INFPORT 1.0</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {condominio?.nome}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" />
            Trocar Turno
          </button>
        </header>

        {/* Painel Principal */}
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Bem-vindo, {operador.nome}!
            </h2>
            <p className="text-sm text-slate-600">
              Nível de Acesso: <span className="font-semibold text-slate-900">
                {operador.nivel_acesso === 0 ? 'Administrador Geral (Dev)' : `Nível ${operador.nivel_acesso}`}
              </span>
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-center">
            <p className="font-medium">Sessão iniciada com sucesso!</p>
            <p className="text-sm text-emerald-600 mt-1">
              Pronto para a integração dos Módulos operacionais.
            </p>
          </div>
        </main>
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
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base"
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
