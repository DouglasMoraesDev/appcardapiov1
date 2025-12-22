import React, { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Trash2, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

type Est = any;

const SuperAdminView: React.FC = () => {
  const { fetchWithAuth, addToast } = useApp() as any;
  const [list, setList] = useState<Est[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, perPage: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [filters, setFilters] = useState({ name: '', from: '', to: '' });

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('perPage', String(meta.perPage || 10));
      if (filters.name) qs.set('name', filters.name);
      if (filters.from) qs.set('from', filters.from);
      if (filters.to) qs.set('to', filters.to);
      const res = await fetchWithAuth('/api/admin/establishments?' + qs.toString());
      const data = await res.json();
      if (!res.ok) throw data;
      setList(data.data || []);
      setMeta(data.meta || { page: 1, perPage: 10, total: 0, pages: 0 });
    } catch (err: any) {
      console.error('Failed to load establishments', err);
      addToast({ title: 'Erro', body: 'Falha ao carregar estabelecimentos', type: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const showDetails = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/admin/establishments/${id}`);
      const data = await res.json();
      if (!res.ok) throw data;
      setSelected(data);
    } catch (err: any) {
      console.error('Failed to load details', err);
      addToast({ title: 'Erro', body: 'Falha ao carregar detalhes', type: 'error' });
    }
  };

  const startEdit = (e: any) => {
    setEditing({ ...e });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const payload: any = { name: editing.name, address: editing.address, cep: editing.cep, cpfCnpj: editing.cpfCnpj, logo: editing.logo, serviceCharge: editing.serviceCharge, adminUserId: editing.adminUserId, theme: editing.theme };
      const res = await fetchWithAuth(`/api/admin/establishments/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw data;
      addToast({ title: 'Salvo', body: 'Estabelecimento atualizado', type: 'success' });
      setEditing(null);
      await load(meta.page || 1);
    } catch (err: any) {
      console.error('Failed to save', err);
      addToast({ title: 'Erro', body: 'Falha ao salvar estabelecimento', type: 'error' });
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Confirma exclusão do estabelecimento? Esta ação é irreversível.')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/establishments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw data;
      addToast({ title: 'Removido', body: 'Estabelecimento apagado', type: 'success' });
      await load(meta.page || 1);
    } catch (err: any) {
      console.error('Failed to delete', err);
      addToast({ title: 'Erro', body: 'Falha ao apagar estabelecimento', type: 'error' });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Super Admin — Estabelecimentos</h2>

      <div className="flex gap-2 mb-4">
        <input placeholder="Nome" value={filters.name} onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))} className="px-3 py-2 bg-zinc-900/50 rounded" />
        <input type="date" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 bg-zinc-900/50 rounded" />
        <input type="date" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 bg-zinc-900/50 rounded" />
        <button onClick={() => load(1)} className="px-4 py-2 bg-amber-500 text-black rounded">Filtrar</button>
        <button onClick={() => { setFilters({ name: '', from: '', to: '' }); load(1); }} className="px-4 py-2 bg-zinc-800 text-white rounded">Limpar</button>
      </div>

      <div className="mb-4">
        <button onClick={() => load(meta.page || 1)} className="px-4 py-2 bg-amber-500 text-black rounded">Atualizar</button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th>ID</th>
              <th>Nome</th>
              <th>Admin</th>
              <th>Endereço</th>
              <th>Contagens</th>
              <th>Receita</th>
              <th>Último Pedido</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                <td className="py-2">{e.id}</td>
                <td className="py-2">{e.name}</td>
                <td className="py-2">{e.adminUser?.username ?? '-'}</td>
                <td className="py-2">{e.address ?? '-'}</td>
                <td className="py-2">Users:{e.counts?.users ?? 0} • Prod:{e.counts?.products ?? 0} • Tables:{e.counts?.tables ?? 0}</td>
                <td className="py-2">R$ {(e.revenue || 0).toFixed(2)}</td>
                <td className="py-2">{e.lastOrderAt ? new Date(e.lastOrderAt).toLocaleString() : '-'}</td>
                <td className="py-2 flex gap-2">
                  <button title="Ver" onClick={() => showDetails(e.id)} className="p-2 rounded hover:bg-zinc-800"><Eye className="w-4 h-4"/></button>
                  <button title="Editar" onClick={() => startEdit(e)} className="p-2 rounded hover:bg-zinc-800"><Edit className="w-4 h-4"/></button>
                  <button title="Excluir" onClick={() => remove(e.id)} className="p-2 rounded hover:bg-red-800 text-red-500"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button disabled={meta.page <= 1} onClick={() => load((meta.page || 1) - 1)} className="p-2 bg-zinc-800 rounded"><ChevronLeft/></button>
        <span>Pagina {meta.page} / {meta.pages}</span>
        <button disabled={meta.page >= (meta.pages || 1)} onClick={() => load((meta.page || 1) + 1)} className="p-2 bg-zinc-800 rounded"><ChevronRight/></button>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-zinc-900 p-6 rounded shadow max-w-2xl w-full overflow-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">Detalhes — {selected.establishment?.name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400">Fechar</button>
            </div>
            <pre className="mt-4 text-xs bg-black/40 p-4 rounded max-h-[60vh] overflow-auto">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-zinc-900 p-6 rounded shadow max-w-2xl w-full overflow-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Editar — {editing.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1 rounded bg-zinc-800">Cancelar</button>
                <button onClick={saveEdit} className="px-3 py-1 rounded bg-amber-500 text-black">Salvar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <input value={editing.name || ''} onChange={(e) => setEditing((s:any)=>({...s,name:e.target.value}))} className="p-2 bg-black/20 rounded" />
              <input value={editing.address || ''} onChange={(e) => setEditing((s:any)=>({...s,address:e.target.value}))} className="p-2 bg-black/20 rounded" />
              <input value={editing.cep || ''} onChange={(e) => setEditing((s:any)=>({...s,cep:e.target.value}))} className="p-2 bg-black/20 rounded" />
              <input value={editing.cpfCnpj || ''} onChange={(e) => setEditing((s:any)=>({...s,cpfCnpj:e.target.value}))} className="p-2 bg-black/20 rounded" />
              <input value={editing.logo || ''} onChange={(e) => setEditing((s:any)=>({...s,logo:e.target.value}))} className="p-2 bg-black/20 rounded" />
              <input type="number" value={editing.serviceCharge ?? 10} onChange={(e) => setEditing((s:any)=>({...s,serviceCharge: Number(e.target.value)}))} className="p-2 bg-black/20 rounded" />
              <select value={editing.adminUserId ?? ''} onChange={(e)=> setEditing((s:any)=>({...s,adminUserId: e.target.value ? Number(e.target.value) : null}))} className="p-2 bg-black/20 rounded">
                <option value="">Nenhum</option>
                {(editing.users || []).map((u:any)=>(<option key={u.id} value={u.id}>{u.username || u.name}</option>))}
              </select>
              <textarea value={JSON.stringify(editing.theme || {}, null, 2)} onChange={(e)=>{
                try { setEditing((s:any)=>({...s,theme: JSON.parse(e.target.value)})); } catch { }
              }} className="p-2 bg-black/20 rounded col-span-2 h-40" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminView;
