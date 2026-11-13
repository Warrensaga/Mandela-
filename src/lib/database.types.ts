// Database types for the Supabase project.
// Row shapes match `supabase gen types typescript`. Insert/Update are derived
// generically to keep this file short. Regenerate the full file with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
// (Embedded selects are not used in the app, so Relationships are left empty.)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded';
export type InventoryReason = 'restock' | 'sale' | 'adjustment' | 'return' | 'cancelled_order';
export type CustomRequestStatus = 'new' | 'quoted' | 'accepted' | 'in_production' | 'ready' | 'delivered' | 'declined';
export type AdminRole = 'owner' | 'staff';
export type AccessRequestStatus = 'pending' | 'approved' | 'declined';

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  has_variants: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  dimensions: string | null;
  materials: string | null;
  room: string | null;
  colour: string | null;
  lead_time_days: number;
  is_made_to_order: boolean;
  free_delivery: boolean;
  badge: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export type ProductOptionRow = {
  id: string;
  product_id: string;
  name: string;
  values: string[];
  sort_order: number;
}

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  option_values: Json;
  price: number | null;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  image_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type HeroSlideRow = {
  id: string;
  image_url: string;
  mobile_image_url: string | null;
  headline: string;
  subtext: string | null;
  cta_label: string | null;
  cta_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export type ReviewRow = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  review_date: string | null;
  source: 'google';
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** A home, office or other space the business has furnished (owner-entered). */
export type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  space_type: string | null;
  location: string | null;
  completed_on: string | null;
  summary: string | null;
  body: string | null;
  scope: string[];
  cover_image_url: string | null;
  gallery: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DeliveryZoneRow = {
  id: string;
  name: string;
  fee: number;
  estimated_days_min: number;
  estimated_days_max: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
  notes: string | null;
  sort_order: number;
}

export type CustomRequestRow = {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  description: string;
  dimensions: string | null;
  preferred_material: string | null;
  budget: number | null;
  reference_image_url: string | null;
  status: CustomRequestStatus;
  quoted_price: number | null;
  deposit_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  custom_request_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  subtotal: number;
  delivery_fee: number;
  delivery_zone_id: string | null;
  total: number;
  deposit_amount: number;
  balance_due: number;
  delivery_address: string | null;
  delivery_city: string | null;
  preferred_delivery_date: string | null;
  estimated_delivery_from: string | null;
  estimated_delivery_to: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  variant_label_snapshot: string | null;
  sku_snapshot: string | null;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
}

export type InventoryMovementRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  change_quantity: number;
  reason: InventoryReason;
  order_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type GuideRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body_markdown: string;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export type SettingRow = {
  key: string;
  value: Json;
  is_public: boolean;
  updated_at: string;
}

export type AdminUserRow = {
  user_id: string;
  role: AdminRole;
  created_at: string;
}

export type AccessRequestRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: AccessRequestStatus;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

export type AdminInventoryRow = {
  product_id: string | null;
  variant_id: string | null;
  product_name: string | null;
  product_slug: string | null;
  variant_label: string | null;
  sku: string | null;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  is_active: boolean | null;
  is_made_to_order: boolean | null;
  category_id: string | null;
  sort_order: number | null;
};

export type AdminCustomerStatsRow = CustomerRow & {
  order_count: number | null;
  total_spent: number | null;
  last_order_at: string | null;
};

export type ProductSummaryRow = {
  id: string | null;
  name: string | null;
  slug: string | null;
  category_id: string | null;
  price: number | null;
  compare_at_price: number | null;
  has_variants: boolean | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  room: string | null;
  materials: string | null;
  colour: string | null;
  badge: string | null;
  free_delivery: boolean | null;
  is_made_to_order: boolean | null;
  lead_time_days: number | null;
  low_stock_threshold: number | null;
  created_at: string | null;
  min_price: number | null;
  max_price: number | null;
  total_stock: number | null;
  active_variant_count: number | null;
  primary_image_url: string | null;
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      admin_users: Table<AdminUserRow, 'user_id'>;
      admin_access_requests: Table<AccessRequestRow, 'user_id'>;
      categories: Table<CategoryRow, 'name' | 'slug'>;
      custom_requests: Table<CustomRequestRow, 'customer_name' | 'description' | 'phone'>;
      customers: Table<CustomerRow, 'full_name' | 'phone'>;
      delivery_zones: Table<DeliveryZoneRow, 'name'>;
      reviews: Table<ReviewRow, 'author_name' | 'rating' | 'body'>;
      guides: Table<GuideRow, 'slug' | 'title'>;
      projects: Table<ProjectRow, 'slug' | 'title'>;
      hero_slides: Table<HeroSlideRow, 'headline' | 'image_url'>;
      inventory_movements: Table<InventoryMovementRow, 'change_quantity' | 'product_id' | 'reason'>;
      order_items: Table<OrderItemRow, 'line_total' | 'order_id' | 'product_name_snapshot' | 'quantity' | 'unit_price_snapshot'>;
      orders: Table<OrderRow, 'customer_id'>;
      product_images: Table<ProductImageRow, 'product_id' | 'url'>;
      product_options: Table<ProductOptionRow, 'name' | 'product_id' | 'values'>;
      product_variants: Table<ProductVariantRow, 'option_values' | 'product_id'>;
      products: Table<ProductRow, 'category_id' | 'name' | 'price' | 'slug'>;
      settings: Table<SettingRow, 'key' | 'value'>;
    };
    Views: {
      product_summaries: { Row: ProductSummaryRow; Relationships: [] };
      admin_inventory: { Row: AdminInventoryRow; Relationships: [] };
      admin_customer_stats: { Row: AdminCustomerStatsRow; Relationships: [] };
    };
    Functions: {
      adjust_stock: {
        Args: { p_change: number; p_note?: string; p_product_id: string; p_reason: InventoryReason; p_variant_id: string | null };
        Returns: number;
      };
      create_order: {
        Args: { p_customer: Json; p_details?: Json; p_items: Json; p_zone_id: string };
        Returns: Json;
      };
      get_order_status: { Args: { p_order_number: string; p_phone: string }; Returns: Json };
      get_best_sellers: { Args: { p_days?: number; p_limit?: number }; Returns: { product_id: string }[] };
      is_admin: { Args: never; Returns: boolean };
      is_owner: { Args: never; Returns: boolean };
      admin_dashboard: { Args: never; Returns: Json };
      admin_decide_access: { Args: { p_user_id: string; p_approve: boolean; p_role?: AdminRole }; Returns: undefined };
      admin_delete_order: { Args: { p_order_id: string }; Returns: string };
      admin_delete_products: { Args: { p_product_ids: string[] }; Returns: Json };
      admin_set_sort_order: { Args: { p_table: string; p_ids: string[] }; Returns: undefined };
      admin_option_usage: { Args: { p_product_id: string }; Returns: Json };
      admin_set_product_options: { Args: { p_product_id: string; p_options: Json; p_renames?: Json }; Returns: Json };
      admin_generate_variants: { Args: { p_product_id: string }; Returns: number };
      admin_convert_custom_request: {
        Args: { p_request_id: string; p_zone_id: string; p_title: string; p_address: string; p_city: string };
        Returns: Json;
      };
      submit_custom_request: {
        Args: {
          p_budget?: number;
          p_customer_name: string;
          p_description: string;
          p_dimensions?: string;
          p_email?: string;
          p_phone: string;
          p_preferred_material?: string;
          p_reference_image_path?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      admin_role: AdminRole;
      access_request_status: AccessRequestStatus;
      custom_request_status: CustomRequestStatus;
      inventory_reason: InventoryReason;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
