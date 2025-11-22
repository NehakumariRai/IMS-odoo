import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, AlertTriangle, TruckIcon, ArrowLeftRight, ClipboardCheck } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
}

interface RecentActivity {
  id: string;
  type: string;
  reference_number: string;
  created_at: string;
  status: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    pendingTransfers: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [productsData, receiptsData, deliveriesData, transfersData, stockData] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('receipts').select('id', { count: 'exact', head: true }).in('status', ['draft', 'ready']),
        supabase.from('delivery_orders').select('id', { count: 'exact', head: true }).in('status', ['draft', 'ready']),
        supabase.from('internal_transfers').select('id', { count: 'exact', head: true }).in('status', ['draft', 'ready']),
        supabase.from('stock_locations').select('product_id, quantity, products!inner(reorder_level)'),
      ]);

      let lowStock = 0;
      if (stockData.data) {
        stockData.data.forEach((stock: any) => {
          if (stock.quantity <= stock.products.reorder_level && stock.products.reorder_level > 0) {
            lowStock++;
          }
        });
      }

      setStats({
        totalProducts: productsData.count || 0,
        lowStockItems: lowStock,
        pendingReceipts: receiptsData.count || 0,
        pendingDeliveries: deliveriesData.count || 0,
        pendingTransfers: transfersData.count || 0,
      });

      const { data: receipts } = await supabase
        .from('receipts')
        .select('id, receipt_number, created_at, status')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: deliveries } = await supabase
        .from('delivery_orders')
        .select('id, delivery_number, created_at, status')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];
      if (receipts) {
        receipts.forEach(r => activities.push({
          id: r.id,
          type: 'Receipt',
          reference_number: r.receipt_number,
          created_at: r.created_at,
          status: r.status,
        }));
      }
      if (deliveries) {
        deliveries.forEach(d => activities.push({
          id: d.id,
          type: 'Delivery',
          reference_number: d.delivery_number,
          created_at: d.created_at,
          status: d.status,
        }));
      }

      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Pending Receipts',
      value: stats.pendingReceipts,
      icon: TruckIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Pending Deliveries',
      value: stats.pendingDeliveries,
      icon: TruckIcon,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Pending Transfers',
      value: stats.pendingTransfers,
      icon: ArrowLeftRight,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time inventory overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.title}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      {activity.type === 'Receipt' ? (
                        <TruckIcon className="w-4 h-4 text-blue-600" />
                      ) : (
                        <TruckIcon className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{activity.reference_number}</div>
                      <div className="text-sm text-gray-500">{activity.type}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
              <Package className="w-6 h-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-600">Add Product</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition">
              <TruckIcon className="w-6 h-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-600">New Receipt</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-red-50 hover:bg-red-100 rounded-lg transition">
              <TruckIcon className="w-6 h-6 text-red-600 mb-2" />
              <span className="text-sm font-medium text-red-600">New Delivery</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
              <ArrowLeftRight className="w-6 h-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-600">Transfer Stock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
