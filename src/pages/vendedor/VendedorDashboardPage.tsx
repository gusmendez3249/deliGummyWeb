import { useEffect, useState, useCallback } from 'react';
import { Truck, DollarSign, Award, Clipboard, Receipt } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import type { CargaVendedor, LiquidacionVendedor } from '../../types';
import { formatCurrency, formatDate, tipoPagoLabel, periodoPagoLabel, estadoLiquidacionColor } from '../../utils/formatters';
import { SectionLoading } from '../../components/ui/TableLoading';

export default function VendedorDashboardPage() {
  const { user } = useAuth();
  const [cargas, setCargas] = useState<CargaVendedor[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionVendedor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cargasRes, liqRes] = await Promise.all([
        api.get('/mis-cargas'),
        api.get('/mis-liquidaciones')
      ]);
      setCargas(cargasRes.data.data || cargasRes.data);
      setLiquidaciones(liqRes.data);
    } catch (err) {
      console.error('Error al cargar datos del vendedor:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <SectionLoading label="Cargando tus rutas y liquidaciones..." rows={4} />
      </div>
    );
  }

  // Cargas abiertas
  const cargasAbiertas = cargas.filter(c => c.estado === 'abierta');
  
  // Paid liquidations to filter out paid cargas from the active summary
  const paidRanges = liquidaciones
    .filter(l => l.estado === 'pagado')
    .map(l => ({
      start: l.fecha_inicio,
      end: l.fecha_fin
    }));

  const isCargaPaid = (fechaStr: string) => {
    return paidRanges.some(range => fechaStr >= range.start && fechaStr <= range.end);
  };

  // Sumar ventas y comisiones acumuladas de las cargas cerradas no pagadas
  let totalVentas = 0;
  let totalComisiones = 0;

  cargas.forEach(c => {
    if (c.estado === 'cerrada' && !isCargaPaid(c.fecha)) {
      c.detalles.forEach(d => {
        totalVentas += d.cantidad_vendida * Number(d.precio_venta);
        totalComisiones += Number(d.pago_vendedor);
      });
    }
  });

  // Inventario en ruta actual (suma de las cantidades de cargas abiertas)
  const inventarioEnRuta: Record<number, { producto: string; codigo: string; cantidad: number }> = {};
  cargasAbiertas.forEach(c => {
    c.detalles.forEach(d => {
      const pid = d.producto_id;
      if (!inventarioEnRuta[pid]) {
        inventarioEnRuta[pid] = {
          producto: d.producto?.nombre,
          codigo: d.producto?.codigo,
          cantidad: 0,
        };
      }
      inventarioEnRuta[pid].cantidad += d.cantidad_salida;
    });
  });

  const inventarioLista = Object.values(inventarioEnRuta);
  const showVentasResumen = user?.vendedor?.tipo_pago !== 'fijo';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Mi Panel de Vendedor</h1>
        <p className="text-sm text-text-secondary">Bienvenido de nuevo, {user?.name}</p>
      </div>

      {/* Seller and Payment Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info Personal */}
        <div className="bg-white rounded-lg border border-border p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">Mis Datos</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-text-muted">Nombre:</span> <strong className="text-text-primary">{user?.name}</strong></p>
              <p><span className="text-text-muted">Usuario:</span> <span className="font-mono text-xs bg-surface px-2 py-0.5 rounded">{user?.username}</span></p>
              <p><span className="text-text-muted">Email:</span> <span className="text-text-primary">{user?.email}</span></p>
              {user?.telefono && (
                <p><span className="text-text-muted">Teléfono:</span> <span className="text-text-primary">{user.telefono}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Info Esquema Pago */}
        <div className="bg-white rounded-lg border border-border p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">Esquema de Pago</h3>
            {user?.vendedor ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-text-muted">Tipo de Pago:</span> <strong>{tipoPagoLabel(user.vendedor.tipo_pago)}</strong></p>
                <p><span className="text-text-muted">Periodo:</span> <span>{periodoPagoLabel(user.vendedor.periodo_pago)}</span></p>
                {user.vendedor.tipo_pago !== 'comision' && (
                  <p><span className="text-text-muted">Salario Base:</span> <strong className="text-success">{formatCurrency(user.vendedor.salario_base)}</strong></p>
                )}
                {user.vendedor.tipo_pago !== 'fijo' && (
                  <p>
                    <span className="text-text-muted">Comisión:</span>{' '}
                    <strong>
                      {user.vendedor.comision_porcentaje > 0 
                        ? `${user.vendedor.comision_porcentaje}% sobre ventas` 
                        : formatCurrency(user.vendedor.comision_monto_fijo)
                      }
                    </strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Sin esquema de pago asignado. Contacta al administrador.</p>
            )}
          </div>
        </div>

        {/* Comisiones y Ventas (Only show if Vendedor has commission scheme) */}
        {showVentasResumen ? (
          <div className="bg-white rounded-lg border border-border p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Resumen de Ganancias Activas</h3>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-text-muted flex items-center gap-1.5"><DollarSign size={14}/> Ventas acumuladas:</span>
                  <strong className="text-text-primary tabular-nums">{formatCurrency(totalVentas)}</strong>
                </p>
                <p className="flex justify-between border-t border-dashed border-border pt-2 mt-2">
                  <span className="text-text-muted flex items-center gap-1.5"><Award size={14}/> Comisión ganada:</span>
                  <strong className="text-primary text-base tabular-nums">{formatCurrency(totalComisiones)}</strong>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg border border-border p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-xs text-text-muted">
              Tienes configurado un esquema de <strong>Sueldo Fijo</strong>. Tu pago se liquida de manera automática cada periodo.
            </p>
          </div>
        )}
      </div>

      {/* Main Content Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mi Inventario Actual (Cargas Abiertas) */}
        <div className="bg-white rounded-lg border border-border shadow-sm flex flex-col">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Clipboard size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Mi mercancía cargada (En Ruta)</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border text-left">
                  <th className="px-4 py-2 font-semibold text-text-secondary">Producto</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary">Código</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary text-center">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {inventarioLista.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-text-muted">
                      No tienes mercancía cargada de momento.
                    </td>
                  </tr>
                ) : (
                  inventarioLista.map((item, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-surface/30">
                      <td className="px-4 py-3 font-medium text-text-primary">{item.producto}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{item.codigo}</td>
                      <td className="px-4 py-3 text-center font-semibold text-primary tabular-nums">{item.cantidad}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Cargas y Rutas */}
        <div className="bg-white rounded-lg border border-border shadow-sm flex flex-col">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Truck size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Mis Cargas y Rutas</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border text-left">
                  <th className="px-4 py-2 font-semibold text-text-secondary">Fecha</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary text-center">Estado</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {cargas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-text-muted">
                      No hay historial de cargas.
                    </td>
                  </tr>
                ) : (
                  cargas.slice(0, 10).map((carga) => {
                    const comisionCarga = carga.estado === 'cerrada'
                      ? carga.detalles.reduce((sum, d) => sum + Number(d.pago_vendedor), 0)
                      : 0;
                    return (
                      <tr key={carga.id} className="border-b border-border hover:bg-surface/30">
                        <td className="px-4 py-3 font-medium">{formatDate(carga.fecha)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                            carga.estado === 'abierta' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {carga.estado === 'abierta' ? 'En Ruta (Abierta)' : 'Cerrada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-text-primary">
                          {carga.estado === 'cerrada' ? formatCurrency(comisionCarga) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mis Liquidaciones section */}
      <div className="bg-white rounded-lg border border-border shadow-sm flex flex-col">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Receipt size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Mis Recibos de Liquidación</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border text-left">
                <th className="px-4 py-3 font-semibold text-text-secondary">Periodo</th>
                <th className="px-4 py-3 text-right font-semibold text-text-secondary">Total Vendido</th>
                <th className="px-4 py-3 text-right font-semibold text-text-secondary">Comisiones</th>
                <th className="px-4 py-3 text-right font-semibold text-text-secondary">Sueldo Base</th>
                <th className="px-4 py-3 text-right font-semibold text-text-secondary">Total Pagado</th>
                <th className="px-4 py-3 text-center font-semibold text-text-secondary">Estado</th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    No tienes liquidaciones registradas.
                  </td>
                </tr>
              ) : (
                liquidaciones.map(l => (
                  <tr key={l.id} className="border-b border-border hover:bg-surface/50">
                    <td className="px-4 py-3">{formatDate(l.fecha_inicio)} al {formatDate(l.fecha_fin)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(l.total_vendido)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary">{formatCurrency(l.total_comision)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">{formatCurrency(l.salario_pagado)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-text-primary">{formatCurrency(l.total_pagado)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${estadoLiquidacionColor(l.estado)}`}>
                        {l.estado === 'pendiente' ? 'Pendiente' : 'Pagado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
