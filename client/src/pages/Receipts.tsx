import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Check, X as XIcon, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Receipt {
  id: string;
  receipt_number: string;
  supplier_name: string;
  warehouse_id: string;
  status: string;
  scheduled_date: string;
  received_date: string | null;
  notes: string;
  warehouses?: { name: string };
}

interface ReceiptLine {
  id?: string;
  product_id: string;
  quantity: number;
  received_quantity: number;
  rack_location: string;
  products?: { name: string; sku: string };
}

export default function Receipts() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);
  const [formData, setFormData] = useState({
    supplier_name: '',
    warehouse_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [receiptsRes, productsRes, warehousesRes] = await Promise.all([
        supabase.from('receipts').select('*, warehouses(name)').order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      ]);

      if (receiptsRes.data) setReceipts(receiptsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptNumber = async () => {
    const { count } = await supabase.from('receipts').select('id', { count: 'exact', head: true });
    return `REC-${String((count || 0) + 1).padStart(5, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiptLines.length === 0) {
      alert('Please add at least one product');
      return;
    }

    setLoading(true);
    try {
      if (editingReceipt) {
        await supabase
          .from('receipts')
          .update({
            supplier_name: formData.supplier_name,
            warehouse_id: formData.warehouse_id,
            scheduled_date: formData.scheduled_date,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingReceipt.id);

        await supabase.from('receipt_lines').delete().eq('receipt_id', editingReceipt.id);

        const linesToInsert = receiptLines.map(line => ({
          receipt_id: editingReceipt.id,
          product_id: line.product_id,
          quantity: line.quantity,
          received_quantity: line.received_quantity,
          rack_location: line.rack_location,
        }));
        await supabase.from('receipt_lines').insert(linesToInsert);
      } else {
        const receiptNumber = await generateReceiptNumber();
        const { data: newReceipt } = await supabase
          .from('receipts')
          .insert({
            receipt_number: receiptNumber,
            supplier_name: formData.supplier_name,
            warehouse_id: formData.warehouse_id,
            scheduled_date: formData.scheduled_date,
            notes: formData.notes,
            status: 'draft',
            created_by: user?.id,
          })
          .select()
          .single();

        if (newReceipt) {
          const linesToInsert = receiptLines.map(line => ({
            receipt_id: newReceipt.id,
            product_id: line.product_id,
            quantity: line.quantity,
            received_quantity: 0,
            rack_location: line.rack_location,
          }));
          await supabase.from('receipt_lines').insert(linesToInsert);
        }
      }

      resetForm();
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (receiptId: string) => {
    if (!confirm('Validate this receipt? Stock will be updated.')) return;

    setLoading(true);
    try {
      const { data: lines } = await supabase
        .from('receipt_lines')
        .select('*, receipts!inner(warehouse_id)')
        .eq('receipt_id', receiptId);

      if (lines) {
        for (const line of lines) {
          const warehouseId = line.receipts.warehouse_id;
          const { data: existingStock } = await supabase
            .from('stock_locations')
            .select('*')
            .eq('product_id', line.product_id)
            .eq('warehouse_id', warehouseId)
            .eq('rack_location', line.rack_location)
            .maybeSingle();

          if (existingStock) {
            await supabase
              .from('stock_locations')
              .update({
                quantity: existingStock.quantity + line.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingStock.id);
          } else {
            await supabase.from('stock_locations').insert({
              product_id: line.product_id,
              warehouse_id: warehouseId,
              rack_location: line.rack_location,
              quantity: line.quantity,
            });
          }

          await supabase.from('receipt_lines').update({ received_quantity: line.quantity }).eq('id', line.id);

          const { data: receipt } = await supabase
            .from('receipts')
            .select('receipt_number')
            .eq('id', receiptId)
            .single();

          if (existingStock) {
            await supabase.from('stock_movements').insert({
              product_id: line.product_id,
              warehouse_id: warehouseId,
              rack_location: line.rack_location,
              movement_type: 'receipt',
              reference_type: 'receipt',
              reference_id: receiptId,
              reference_number: receipt?.receipt_number || '',
              quantity_change: line.quantity,
              quantity_before: existingStock.quantity,
              quantity_after: existingStock.quantity + line.quantity,
              created_by: user?.id,
            });
          } else {
            await supabase.from('stock_movements').insert({
              product_id: line.product_id,
              warehouse_id: warehouseId,
              rack_location: line.rack_location,
              movement_type: 'receipt',
              reference_type: 'receipt',
              reference_id: receiptId,
              reference_number: receipt?.receipt_number || '',
              quantity_change: line.quantity,
              quantity_before: 0,
              quantity_after: line.quantity,
              created_by: user?.id,
            });
          }
        }
      }

      await supabase
        .from('receipts')
        .update({
          status: 'done',
          received_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', receiptId);

      loadData();
    } catch (error) {
      console.error('Error validating receipt:', error);
      alert('Error validating receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (receiptId: string) => {
    if (!confirm('Cancel this receipt?')) return;

    try {
      await supabase.from('receipts').update({ status: 'cancelled' }).eq('id', receiptId);
      loadData();
    } catch (error) {
      console.error('Error cancelling receipt:', error);
    }
  };

  const handleEdit = async (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setFormData({
      supplier_name: receipt.supplier_name,
      warehouse_id: receipt.warehouse_id,
      scheduled_date: receipt.scheduled_date,
      notes: receipt.notes,
    });

    const { data: lines } = await supabase
      .from('receipt_lines')
      .select('*, products(name, sku)')
      .eq('receipt_id', receipt.id);

    if (lines) {
      setReceiptLines(lines);
    }

    setShowModal(true);
  };

  const resetForm = () => {
    setEditingReceipt(null);
    setFormData({
      supplier_name: '',
      warehouse_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setReceiptLines([]);
  };

  const addLine = () => {
    setReceiptLines([...receiptLines, { product_id: '', quantity: 0, received_quantity: 0, rack_location: '' }]);
  };

  const updateLine = (index: number, field: keyof ReceiptLine, value: any) => {
    const updated = [...receiptLines];
    updated[index] = { ...updated[index], [field]: value };
    setReceiptLines(updated);
  };

  const removeLine = (index: number) => {
    setReceiptLines(receiptLines.filter((_, i) => i !== index));
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
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">Manage incoming stock</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Receipt
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No receipts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Receipt #</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Supplier</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Warehouse</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Scheduled</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{receipt.receipt_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{receipt.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{receipt.warehouses?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(receipt.scheduled_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {receipt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {receipt.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEdit(receipt)}
                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1 mr-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleValidate(receipt.id)}
                            className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition inline-flex items-center gap-1 mr-2"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancel(receipt.id)}
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
                {editingReceipt ? 'Edit Receipt' : 'New Receipt'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
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
                  {receiptLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-5">
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
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={line.rack_location}
                          onChange={(e) => updateLine(index, 'rack_location', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Rack location"
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
                  {loading ? 'Saving...' : editingReceipt ? 'Update Receipt' : 'Create Receipt'}
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
