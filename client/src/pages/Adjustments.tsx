import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Adjustments() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    rack_location: '',
    actual_quantity: 0,
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [adjustmentsRes, productsRes, warehousesRes] = await Promise.all([
        supabase
          .from('stock_adjustments')
          .select('*, products(name, sku), warehouses(name)')
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      ]);

      if (adjustmentsRes.data) setAdjustments(adjustmentsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAdjustmentNumber = async () => {
    const { count } = await supabase.from('stock_adjustments').select('id', { count: 'exact', head: true });
    return `ADJ-${String((count || 0) + 1).padStart(5, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: stockLocation } = await supabase
        .from('stock_locations')
        .select('*')
        .eq('product_id', formData.product_id)
        .eq('warehouse_id', formData.warehouse_id)
        .eq('rack_location', formData.rack_location)
        .maybeSingle();

      const systemQty = stockLocation?.quantity || 0;
      const difference = formData.actual_quantity - systemQty;

      const adjustmentNumber = await generateAdjustmentNumber();

      await supabase.from('stock_adjustments').insert({
        adjustment_number: adjustmentNumber,
        product_id: formData.product_id,
        warehouse_id: formData.warehouse_id,
        rack_location: formData.rack_location,
        system_quantity: systemQty,
        actual_quantity: formData.actual_quantity,
        reason: formData.reason,
        adjusted_by: user?.id,
      });

      if (stockLocation) {
        await supabase
          .from('stock_locations')
          .update({
            quantity: formData.actual_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stockLocation.id);
      } else if (formData.actual_quantity > 0) {
        await supabase.from('stock_locations').insert({
          product_id: formData.product_id,
          warehouse_id: formData.warehouse_id,
          rack_location: formData.rack_location,
          quantity: formData.actual_quantity,
        });
      }

      await supabase.from('stock_movements').insert({
        product_id: formData.product_id,
        warehouse_id: formData.warehouse_id,
        rack_location: formData.rack_location,
        movement_type: 'adjustment',
        reference_type: 'stock_adjustment',
        reference_id: adjustmentNumber,
        reference_number: adjustmentNumber,
        quantity_change: difference,
        quantity_before: systemQty,
        quantity_after: formData.actual_quantity,
        created_by: user?.id,
      });

      resetForm();
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error creating adjustment:', error);
      alert('Error creating adjustment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      warehouse_id: '',
      rack_location: '',
      actual_quantity: 0,
      reason: '',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Adjustments</h1>
          <p className="text-gray-600 mt-1">Correct inventory discrepancies</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Adjustment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No adjustments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Adjustment #</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Product</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Warehouse</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">System Qty</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Actual Qty</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Difference</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adjustments.map((adj) => {
                  const diff = adj.actual_quantity - adj.system_quantity;
                  return (
                    <tr key={adj.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{adj.adjustment_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{adj.products?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{adj.warehouses?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right">{adj.system_quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right">{adj.actual_quantity}</td>
                      <td className={`px-6 py-4 text-sm font-medium text-right ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(adj.adjusted_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">New Stock Adjustment</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse *</label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rack Location</label>
                  <input
                    type="text"
                    value={formData.rack_location}
                    onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., A-01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Quantity *</label>
                  <input
                    type="number"
                    value={formData.actual_quantity}
                    onChange={(e) => setFormData({ ...formData, actual_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Create Adjustment'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
