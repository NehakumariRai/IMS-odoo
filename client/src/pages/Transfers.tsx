import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Transfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transfersRes, warehousesRes] = await Promise.all([
        supabase
          .from('internal_transfers')
          .select(`
            *,
            from_warehouse:warehouses!internal_transfers_from_warehouse_id_fkey(name),
            to_warehouse:warehouses!internal_transfers_to_warehouse_id_fkey(name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      ]);

      if (transfersRes.data) setTransfers(transfersRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Internal Transfers</h1>
          <p className="text-gray-600 mt-1">Transfer stock between warehouses</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Transfer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No transfers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Transfer #</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">From</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">To</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Scheduled</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{transfer.transfer_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{transfer.from_warehouse?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{transfer.to_warehouse?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(transfer.scheduled_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                        {transfer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
