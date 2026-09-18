import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Settings, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sliders, 
  Phone, 
  Building,
  Radio
} from 'lucide-react';

export default function Configuracoes({ usuarioLogado }) {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Templates de Mensagem do WhatsApp
  const [templateEncomenda, setTemplateEncomenda] = useState(
    'Olá {NOME}, sua encomenda ({CODIGO}) chegou na portaria do condomínio e está disponível para retirada!'
  );
  const [templateCustodia, setTemplateCustodia] = useState(
    'Olá {NOME}, um item retido na portaria ({DESCRICAO}) aguarda sua retirada.'
  );

  // Feature Flags (Módulos Ativos)
  const [modulosAtivos, setModulosAtivos] = useState({
    encomendas: true,
    custodia: true,
    materiais: true,
    chaves: true,
    manutencao: true,
    rondas: true,
    ocorrencias: true,
    passagem: true,
    prestadores: true
  });

  // Contatos de Emergência
  const [telefonePolicia, setTelefonePolicia] = useState('190');
  const [telefoneBombeiros, setTelefoneBombeiros] = useState('193');
  const [telefoneSindico, setTelefoneSindico] = useState('');

  useEffect(() => {
    carregarConfiguracoes();
  }, [usuarioLogado]);

  const carregarConfiguracoes = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .maybeSingle();

      if (data) {
        if (data.template_encomenda) setTemplateEncomenda(data.template_encomenda);
        if (data.template_custodia) setTemplateCustodia(data.template_custodia);
        if (data.telefone_sindico) setTelefoneSindico(data.telefone_sindico);
        if (data.modulos_ativos) setModulosAtivos(data.modulos_ativos);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        template_encomenda: templateEncomenda,
        template_custodia: templateCustodia,
        telefone_sindico: telefoneSindico,
        modulos_ativos: modulosAtivos
      };

      const { error } = await supabase
        .from('configuracoes')
        .upsert([payload], { onConflict: 'condominio_id' });

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: 'Configurações e templates salvos com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleModulo = (chave) => {
    setModulosAtivos(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  const dispararEmergencia = (tipo, numero) => {
    const texto = encodeURIComponent(`🚨 ALERTA DE EMERGÊNCIA NA PORTARIA - CONDOMÍNIO: ${usuarioLogado?.condominio_nome || 'INFPORT'}\nSolicitação de apoio imediato para ocorrência de ${tipo}.`);
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Settings className="w-3.5 h-3.5" /> Módulo 11 - Configurações Gerais
          </span>
          <h3 className="font-bold text-lg mt-1">Geral, Feature Flags & Emergência</h3>
          <p className="text-xs text-slate-300">Personalize os templates do WhatsApp, ative módulos e configure o botão de pânico.</p>
        </div>
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

      {/* Painel de Botões de Emergência Direta */}
      <div className="bg-red-50 border border-red-200 p-5 rounded-2xl space-y-3">
        <h4 className="font-bold text-red-900 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" /> Botão de Emergência da Guarita
        </h4>
        <p className="text-xs text-red-700">
          Disparo rápido de chamados de emergência direto pelo WhatsApp da equipe de segurança e gestão.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={() => dispararEmergencia('POLÍCIA / INVASÃO', telefonePolicia)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Phone className="w-4 h-4" /> Emergência Policial (190)
          </button>

          <button
            onClick={() => dispararEmergencia('INCÊNDIO / RESGATE', telefoneBombeiros)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Phone className="w-4 h-4" /> Bombeiros (193)
          </button>

          <button
            onClick={() => telefoneSindico ? dispararEmergencia('URGÊNCIA NO POSTO', telefoneSindico) : alert('Cadastre o telefone do síndico abaixo.')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Phone className="w-4 h-4" /> Alerta Síndico / Supervisor
          </button>
        </div>
      </div>

      <form onSubmit={salvarConfiguracoes} className="space-y-6">
        {/* Templates de WhatsApp */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <MessageSquare className="w-4 h-4 text-emerald-600" /> Templates do WhatsApp
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notificação de Encomenda Recebida
              </label>
              <textarea
                rows="2"
                value={templateEncomenda}
                onChange={(e) => setTemplateEncomenda(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs resize-none font-mono"
              ></textarea>
              <span className="text-[10px] text-slate-400">Variáveis disponíveis: &#123;NOME&#125;, &#123;CODIGO&#125;, &#123;UNIDADE&#125;</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notificação de Custódia de Itens
              </label>
              <textarea
                rows="2"
                value={templateCustodia}
                onChange={(e) => setTemplateCustodia(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs resize-none font-mono"
              ></textarea>
              <span className="text-[10px] text-slate-400">Variáveis disponíveis: &#123;NOME&#125;, &#123;DESCRICAO&#125;</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Telefone do Síndico / Supervisor (WhatsApp)
              </label>
              <input
                type="text"
                value={telefoneSindico}
                onChange={(e) => setTelefoneSindico(e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Feature Flags / Módulos Ativos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Sliders className="w-4 h-4 text-emerald-600" /> Feature Flags (Módulos Habilitados)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {Object.keys(modulosAtivos).map((key) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold uppercase text-slate-700">{key}</span>
                <input
                  type="checkbox"
                  checked={modulosAtivos[key]}
                  onChange={() => toggleModulo(key)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase flex items-center gap-2 shadow-md transition"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
