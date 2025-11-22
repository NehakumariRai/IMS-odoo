import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Check, X as XIcon, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Delivery {
  id: string;
  delivery_number: string;
  customer_name: string;
  warehouse_id: string;
  status: string;
  scheduled_date: string;
  delivered_date: string | null;
  notes: string;
  warehouses?: { name: string };
}

interface DeliveryLine {
  id?: string;
  product_id: string;
  quantity: number;
  delivered_quantity: number;
  products?: { name: string; sku: string };
}

export default function Deliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [deliveryLines, setDeliveryLines] = useState<DeliveryLine[]>([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    warehouse_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [deliveriesRes, productsRes, warehousesRes] = await Promise.all([
        supabase.from('delivery_orders').select('*, warehouses(name)').order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      ]);

      if (deliveriesRes.data) setDeliveries(deliveriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDeliveryNumber = async () => {
    const { count } = await supabase.from('delivery_orders').select('id', { count: 'exact', head: true });
    return `DEL-${String((count || 0) + 1).padStart(5, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deliveryLines.length === 0) {
      alert('Please add at least one product');
      return;
    }

    setLoading(true);
    try {
      if (editingDelivery) {
        await supabase
          .from('delivery_orders')
          .update({
            customer_name: formData.customer_name,
            warehouse_id: formData.warehouse_id,
            scheduled_date: formData.scheduled_date,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDelivery.id);

        await supabase.from('delivery_lines').delete().eq('delivery_id', editingDelivery.id);

        const linesToInsert = deliveryLines.map(line => ({
          delivery_id: editingDelivery.id,
          product_id: line.product_id,
          quantity: line.quantity,
          delivered_quantity: 0,
        }));
        await supabase.from('delivery_lines').insert(linesToInsert);
      } else {
        const deliveryNumber = await generateDeliveryNumber();
        const { data: newDelivery } = await supabase
          .from('delivery_orders')
          .insert({
            delivery_number: deliveryNumber,
            customer_name: formData.customer_name,
            warehouse_id: formData.warehouse_id,
            scheduled_date: formData.scheduled_date,
            notes: formData.notes,
            status: 'draft',
            created_by: user?.id,
          })
          .select()
          .single();

        if (newDelivery) {
          const linesToInsert = deliveryLines.map(line => ({
            delivery_id: newDelivery.id,
            product_id: line.product_id,
            quantity: line.quantity,
            delivered_quantity: 0,
          }));
          await supabase.from('delivery_lines').insert(linesToInsert);
        }
      }

      resetForm();
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Error saving delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (deliveryId: string) => {
    if (!confirm('Validate this delivery? Stock will be deducted.')) return;

    setLoading(true);
    try {
      const { data: lines } = await supabase
        .from('delivery_lines')
        .select('*, delivery_orders!inner(warehouse_id, delivery_number)')
        .eq('delivery_id', deliveryId);

      if (lines) {
        for (const line of lines) {
          const warehouseId = line.delivery_orders.warehouse_id;

          const { data: stockLocations } = await supabase
            .from('stock_locations')
            .select('*')
            .eq('product_id', line.product_id)
            .eq('warehouse_id', warehouseId)
            .gt('quantity', 0)
            .order('quantity', { ascending: false });

          if (!stockLocations || stockLocations.length === 0) {
            alert('Insufficient stock for one or more products');
            setLoading(false);
            return;
          }

          let remainingQty = line.quantity;
          for (const stock of stockLocations) {
            if (remainingQty <= 0) break;

            const deductQty = Math.min(remainingQty, stock.quantity);
            const newQty = stock.quantity - deductQty;

            await supabase
              .from('stock_locations')
              .update({
                quantity: newQty,
                updated_at: new Date().toISOString(),
              })
              .eq('id', stock.id);

            await supabase.from('stock_movements').insert({
              product_id: line.product_id,
              warehouse_id: warehouseId,
              rack_location: stock.rack_location,
              movement_type: 'delivery',
              reference_type: 'delivery_order',
              reference_id: deliveryId,
              reference_number: line.delivery_orders.delivery_number,
              quantity_change: -deductQty,
              quantity_before: stock.quantity,
              quantity_after: newQty,
              created_by: user?.id,
            });

            remainingQty -= deductQty;
          }

          await supabase.from('delivery_lines').update({ delivered_quantity: line.quantity }).eq('id', line.id);
        }
      }

      await supabase
        .from('delivery_orders')
        .update({
          status: 'done',
          delivered_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      loadData();
    } catch (error) {
      console.error('Error validating delivery:', error);
      alert('Error validating delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (deliveryId: string) => {
    if (!confirm('Cancel this delivery?')) return;
    try {
      await supabase.from('delivery_orders').update({ status: 'cancelled' }).eq('id', deliveryId);
      loadData();
    } catch (error) {
      console.error('Error cancelling delivery:', error);
    }
  };

  const handleEdit = async (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setFormData({
      customer_name: delivery.customer_name,
      warehouse_id: delivery.warehouse_id,
      scheduled_date: delivery.scheduled_date,
      notes: delivery.notes,
    });

    const { data: lines } = await supabase
      .from('delivery_lines')
      .select('*, products(name, sku)')
      .eq('delivery_id', delivery.id);

    if (lines) setDeliveryLines(lines);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingDelivery(null);
    setFormData({
      customer_name: '',
      warehouse_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setDeliveryLines([]);
  };

  const addLine = () => {
    setDeliveryLines([...deliveryLines, { product_id: '', quantity: 0, delivered_quantity: 0 }]);
  };

  const updateLine = (index: number, field: keyof DeliveryLine, value: any) => {
    const updated = [...deliveryLines];
    updated[index] = { ...updated[index], [field]: value };
    setDeliveryLines(updated);
  };

  const removeLine = (index: number) => {
    setDeliveryLines(deliveryLines.filter((_, i) => i !== index));
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
          <h1 className="text-3xl font-bold text-gray-900">Delivery Orders</h1>
          <p className="text-gray-600 mt-1">Manage outgoing stock</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Delivery
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No deliveries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Delivery #</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Warehouse</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Scheduled</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{delivery.delivery_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{delivery.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{delivery.warehouses?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(delivery.scheduled_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {delivery.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEdit(delivery)}
                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1 mr-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleValidate(delivery.id)}
                            className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition inline-flex items-center gap-1 mr-2"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancel(delivery.id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingDelivery ? 'Edit Delivery' : 'New Delivery'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date *</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Product
                  </button>
                </div>

                <div className="space-y-3">
                  {deliveryLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-9">
                        <select
                          value={line.product_id}
                          onChange={(e) => updateLine(index, 'product_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Qty"
                          min="0"
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingDelivery ? 'Update Delivery' : 'Create Delivery'}
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
