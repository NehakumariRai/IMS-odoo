import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, ArrowUp, ArrowDown } from 'lucide-react';

export default function Movements() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadMovements();
  }, [filterType]);

  const loadMovements = async () => {
    try {
      let query = supabase
        .from('stock_movements')
        .select('*, products(name, sku), warehouses(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('movement_type', filterType);
      }

      const { data } = await query;
      if (data) setMovements(data);
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'receipt': return 'bg-green-100 text-green-800';
      case 'delivery': return 'bg-red-100 text-red-800';
      case 'transfer_in': return 'bg-blue-100 text-blue-800';
      case 'transfer_out': return 'bg-orange-100 text-orange-800';
      case 'adjustment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Movement History</h1>
        <p className="text-gray-600 mt-1">Complete audit trail of all stock movements</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('receipt')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === 'receipt' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Receipts
          </button>
          <button
            onClick={() => setFilterType('delivery')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === 'delivery' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Deliveries
          </button>
          <button
            onClick={() => setFilterType('adjustment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === 'adjustment' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Adjustments
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No movements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Reference</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Product</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Warehouse</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Change</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Before</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(movement.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                        {movement.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{movement.reference_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {movement.products?.name}
                      <div className="text-xs text-gray-500">{movement.products?.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{movement.warehouses?.name}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className={`flex items-center justify-end gap-1 font-medium ${
                        movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.quantity_change > 0 ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )}
                        {Math.abs(movement.quantity_change)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">{movement.quantity_before}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{movement.quantity_after}</td>
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
