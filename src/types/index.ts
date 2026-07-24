export interface Role {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface User {
  id: number;
  role_id: number;
  name: string;
  username: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
  imagen_url: string | null;
  role: Role;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  productos_count?: number;
}

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
  activo: boolean;
  productos_count?: number;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  unidad_medida_id: number;
  marca: string | null;
  costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  imagen_url: string | null;
  activo: boolean;
  categoria: Categoria;
  unidad_medida: UnidadMedida;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  usuario_id: number;
  tipo_movimiento: 'alta' | 'baja' | 'ajuste' | 'salida_ruta' | 'devolucion_ruta';
  cantidad: number;
  observaciones: string | null;
  fecha_movimiento: string;
  producto: Producto;
  usuario: User;
}

export interface Vendedor {
  id: number;
  usuario_id: number;
  tipo_pago: 'fijo' | 'comision' | 'mixto';
  salario_base: number;
  comision_porcentaje: number;
  comision_monto_fijo: number;
  periodo_pago: 'diario' | 'semanal' | 'quincenal' | 'mensual';
  activo: boolean;
  usuario: User;
}

export interface DetalleCargaVendedor {
  id: number;
  carga_vendedor_id: number;
  producto_id: number;
  cantidad_salida: number;
  cantidad_vendida: number;
  cantidad_devuelta: number;
  precio_venta: number;
  pago_vendedor: number;
  producto: Producto;
}

export interface CargaVendedor {
  id: number;
  usuario_id: number;
  fecha: string;
  estado: 'abierta' | 'cerrada';
  observaciones: string | null;
  usuario: User;
  detalles: DetalleCargaVendedor[];
}

export interface LiquidacionVendedor {
  id: number;
  vendedor_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  total_vendido: number;
  total_comision: number;
  salario_pagado: number;
  total_pagado: number;
  estado: 'pendiente' | 'pagado';
  vendedor: Vendedor;
}

export interface DashboardStats {
  stock_total: number;
  productos_stock_bajo: number;
  productos_stock_bajo_lista: Producto[];
  ventas_hoy: number;
  ganancia_hoy: number;
  vendedores_activos: number;
  ultimos_movimientos: MovimientoInventario[];
  ventas_semana: { fecha: string; total: number }[];
  top_productos: { nombre: string; total_vendido: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ReporteVentasDetalle {
  id: number;
  producto: string;
  codigo: string;
  categoria: string;
  vendedor: string;
  fecha: string;
  cantidad_salida: number;
  cantidad_vendida: number;
  cantidad_devuelta: number;
  precio_venta: number;
  costo: number;
  pago_vendedor: number;
  subtotal: number;
  inversion: number;
  sobrante: number;
  ganancia: number;
}

export interface ReporteVentas {
  detalles: ReporteVentasDetalle[];
  totales: {
    total_vendido: number;
    total_inversion: number;
    total_pago_vendedor: number;
    total_ganancia: number;
    total_unidades_vendidas: number;
  };
}

export interface DetalleVentaDirecta {
  id: number;
  venta_directa_id: number;
  producto_id: number;
  cantidad: number;
  precio_venta: number;
  costo: number;
  subtotal: number;
  producto?: Producto;
}

export interface VentaDirecta {
  id: number;
  usuario_id: number;
  fecha: string;
  total: number;
  nota: string | null;
  usuario?: User;
  detalles?: DetalleVentaDirecta[];
  created_at?: string;
}

