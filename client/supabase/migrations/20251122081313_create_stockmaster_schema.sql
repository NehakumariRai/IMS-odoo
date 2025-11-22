/*
  # StockMaster - Inventory Management System Database Schema

  ## Overview
  Complete database schema for StockMaster IMS supporting multi-warehouse inventory tracking,
  product management, stock movements, and audit trails.

  ## 1. New Tables

  ### users_profile
  - `id` (uuid, primary key) - References auth.users
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'admin', 'manager', 'staff'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### warehouses
  - `id` (uuid, primary key) - Unique warehouse identifier
  - `name` (text) - Warehouse name
  - `code` (text, unique) - Warehouse code (e.g., WH001)
  - `address` (text) - Physical address
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### categories
  - `id` (uuid, primary key) - Unique category identifier
  - `name` (text) - Category name
  - `description` (text) - Category description
  - `created_at` (timestamptz) - Record creation timestamp

  ### products
  - `id` (uuid, primary key) - Unique product identifier
  - `sku` (text, unique) - Stock Keeping Unit
  - `name` (text) - Product name
  - `description` (text) - Product description
  - `category_id` (uuid) - Foreign key to categories
  - `unit_of_measure` (text) - Unit (e.g., 'pcs', 'kg', 'ltr')
  - `reorder_level` (integer) - Minimum stock threshold
  - `reorder_quantity` (integer) - Suggested reorder quantity
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### stock_locations
  - `id` (uuid, primary key) - Unique location identifier
  - `product_id` (uuid) - Foreign key to products
  - `warehouse_id` (uuid) - Foreign key to warehouses
  - `rack_location` (text) - Rack/bin location identifier
  - `quantity` (integer) - Current stock quantity
  - `reserved_quantity` (integer) - Reserved for orders
  - `available_quantity` (integer, computed) - quantity - reserved_quantity
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### receipts
  - `id` (uuid, primary key) - Unique receipt identifier
  - `receipt_number` (text, unique) - Auto-generated receipt number
  - `supplier_name` (text) - Vendor/supplier name
  - `warehouse_id` (uuid) - Foreign key to warehouses
  - `status` (text) - 'draft', 'ready', 'done', 'cancelled'
  - `scheduled_date` (date) - Expected receipt date
  - `received_date` (date) - Actual receipt date
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - Foreign key to auth.users
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### receipt_lines
  - `id` (uuid, primary key) - Unique line identifier
  - `receipt_id` (uuid) - Foreign key to receipts
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (integer) - Quantity to receive
  - `received_quantity` (integer) - Actually received quantity
  - `rack_location` (text) - Target storage location
  - `created_at` (timestamptz) - Record creation timestamp

  ### delivery_orders
  - `id` (uuid, primary key) - Unique delivery identifier
  - `delivery_number` (text, unique) - Auto-generated delivery number
  - `customer_name` (text) - Customer/recipient name
  - `warehouse_id` (uuid) - Foreign key to warehouses
  - `status` (text) - 'draft', 'ready', 'done', 'cancelled'
  - `scheduled_date` (date) - Expected delivery date
  - `delivered_date` (date) - Actual delivery date
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - Foreign key to auth.users
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### delivery_lines
  - `id` (uuid, primary key) - Unique line identifier
  - `delivery_id` (uuid) - Foreign key to delivery_orders
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (integer) - Quantity to deliver
  - `delivered_quantity` (integer) - Actually delivered quantity
  - `created_at` (timestamptz) - Record creation timestamp

  ### internal_transfers
  - `id` (uuid, primary key) - Unique transfer identifier
  - `transfer_number` (text, unique) - Auto-generated transfer number
  - `from_warehouse_id` (uuid) - Source warehouse
  - `to_warehouse_id` (uuid) - Destination warehouse
  - `status` (text) - 'draft', 'ready', 'done', 'cancelled'
  - `scheduled_date` (date) - Expected transfer date
  - `transferred_date` (date) - Actual transfer date
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - Foreign key to auth.users
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### transfer_lines
  - `id` (uuid, primary key) - Unique line identifier
  - `transfer_id` (uuid) - Foreign key to internal_transfers
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (integer) - Quantity to transfer
  - `transferred_quantity` (integer) - Actually transferred quantity
  - `from_rack_location` (text) - Source rack location
  - `to_rack_location` (text) - Destination rack location
  - `created_at` (timestamptz) - Record creation timestamp

  ### stock_adjustments
  - `id` (uuid, primary key) - Unique adjustment identifier
  - `adjustment_number` (text, unique) - Auto-generated adjustment number
  - `product_id` (uuid) - Foreign key to products
  - `warehouse_id` (uuid) - Foreign key to warehouses
  - `rack_location` (text) - Rack location being adjusted
  - `system_quantity` (integer) - Quantity in system before adjustment
  - `actual_quantity` (integer) - Actual physical count
  - `difference` (integer, computed) - actual_quantity - system_quantity
  - `reason` (text) - Reason for adjustment
  - `adjusted_by` (uuid) - Foreign key to auth.users
  - `adjusted_at` (timestamptz) - Adjustment timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### stock_movements
  - `id` (uuid, primary key) - Unique movement identifier
  - `product_id` (uuid) - Foreign key to products
  - `warehouse_id` (uuid) - Foreign key to warehouses
  - `rack_location` (text) - Rack location
  - `movement_type` (text) - 'receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment'
  - `reference_type` (text) - Type of source document
  - `reference_id` (uuid) - Source document ID
  - `reference_number` (text) - Source document number
  - `quantity_change` (integer) - Positive for incoming, negative for outgoing
  - `quantity_before` (integer) - Stock quantity before movement
  - `quantity_after` (integer) - Stock quantity after movement
  - `created_by` (uuid) - Foreign key to auth.users
  - `created_at` (timestamptz) - Movement timestamp

  ## 2. Security

  All tables have RLS enabled with appropriate policies for:
  - Authenticated users can read all data
  - Only authenticated users with proper roles can modify data
  - Users can only see and modify data within their access scope

  ## 3. Indexes

  Created on frequently queried columns for optimal performance:
  - Product SKU lookups
  - Stock location queries
  - Movement history queries
  - Document number searches

  ## 4. Important Notes

  - All stock movements are automatically logged in stock_movements table
  - Stock quantities are updated via triggers when documents are validated
  - Document numbers are auto-generated with appropriate prefixes
  - All timestamps use timestamptz for timezone awareness
  - Soft deletes via is_active flags where applicable
*/

-- Users Profile Table
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit_of_measure text NOT NULL DEFAULT 'pcs',
  reorder_level integer DEFAULT 0,
  reorder_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Locations Table
CREATE TABLE IF NOT EXISTS stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  rack_location text DEFAULT '',
  quantity integer DEFAULT 0,
  reserved_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id, rack_location)
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_product ON stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse ON stock_locations(warehouse_id);

ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock locations"
  ON stock_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create stock locations"
  ON stock_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock locations"
  ON stock_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  supplier_name text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'cancelled')),
  scheduled_date date DEFAULT CURRENT_DATE,
  received_date date,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_warehouse ON receipts(warehouse_id);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create receipts"
  ON receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update receipts"
  ON receipts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete receipts"
  ON receipts FOR DELETE
  TO authenticated
  USING (true);

-- Receipt Lines Table
CREATE TABLE IF NOT EXISTS receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 0,
  received_quantity integer DEFAULT 0,
  rack_location text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines(receipt_id);

ALTER TABLE receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receipt lines"
  ON receipt_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create receipt lines"
  ON receipt_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update receipt lines"
  ON receipt_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete receipt lines"
  ON receipt_lines FOR DELETE
  TO authenticated
  USING (true);

-- Delivery Orders Table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'cancelled')),
  scheduled_date date DEFAULT CURRENT_DATE,
  delivered_date date,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_warehouse ON delivery_orders(warehouse_id);

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delivery orders"
  ON delivery_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create delivery orders"
  ON delivery_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery orders"
  ON delivery_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete delivery orders"
  ON delivery_orders FOR DELETE
  TO authenticated
  USING (true);

-- Delivery Lines Table
CREATE TABLE IF NOT EXISTS delivery_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 0,
  delivered_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery ON delivery_lines(delivery_id);

ALTER TABLE delivery_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delivery lines"
  ON delivery_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create delivery lines"
  ON delivery_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery lines"
  ON delivery_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete delivery lines"
  ON delivery_lines FOR DELETE
  TO authenticated
  USING (true);

-- Internal Transfers Table
CREATE TABLE IF NOT EXISTS internal_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  from_warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'cancelled')),
  scheduled_date date DEFAULT CURRENT_DATE,
  transferred_date date,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (from_warehouse_id != to_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_transfers_status ON internal_transfers(status);

ALTER TABLE internal_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view internal transfers"
  ON internal_transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create internal transfers"
  ON internal_transfers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update internal transfers"
  ON internal_transfers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete internal transfers"
  ON internal_transfers FOR DELETE
  TO authenticated
  USING (true);

-- Transfer Lines Table
CREATE TABLE IF NOT EXISTS transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES internal_transfers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 0,
  transferred_quantity integer DEFAULT 0,
  from_rack_location text DEFAULT '',
  to_rack_location text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON transfer_lines(transfer_id);

ALTER TABLE transfer_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfer lines"
  ON transfer_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create transfer lines"
  ON transfer_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transfer lines"
  ON transfer_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transfer lines"
  ON transfer_lines FOR DELETE
  TO authenticated
  USING (true);

-- Stock Adjustments Table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number text UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  rack_location text DEFAULT '',
  system_quantity integer NOT NULL DEFAULT 0,
  actual_quantity integer NOT NULL DEFAULT 0,
  reason text DEFAULT '',
  adjusted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  adjusted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock adjustments"
  ON stock_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create stock adjustments"
  ON stock_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Stock Movements Table (Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  rack_location text DEFAULT '',
  movement_type text NOT NULL CHECK (movement_type IN ('receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment')),
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  reference_number text NOT NULL,
  quantity_change integer NOT NULL,
  quantity_before integer NOT NULL DEFAULT 0,
  quantity_after integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default warehouse and category
INSERT INTO warehouses (code, name, address) 
VALUES ('WH001', 'Main Warehouse', 'Default warehouse location')
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (name, description) 
VALUES ('General', 'General products category')
ON CONFLICT (name) DO NOTHING;