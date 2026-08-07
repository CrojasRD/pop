-- =====================================================================
-- Datos semilla adicionales: cronograma del camión, activos, proveedores
-- y gastos. Generado a partir de los datos de referencia del demo.
-- Requiere que 00_schema.sql, 02_policies.sql y 03_seed.sql (zonas) ya
-- estén aplicados. created_by se deja en NULL (no hay usuario 'sistema';
-- los server actions siempre lo llenan con el usuario autenticado real).
-- =====================================================================

-- Cronograma del camión de la empresa (10 registros, 1 por zona)
insert into public.truck_schedule (zone_id, activity_name, start_date, end_date, notes, status) values
  ((select id from public.zones where name = 'ZONA SUR'), 'Mantenimiento de fachadas y habladores', '2026-06-20', '2026-06-25', 'Revisión de acrílicos y rompetráficos dañados.', 'scheduled'),
  ((select id from public.zones where name = 'ZONA CENTRO'), 'Entrega de material POP y letreros nuevos', '2026-07-10', '2026-07-18', 'Incluye instalación de letrero institucional en 3 agencias.', 'scheduled'),
  ((select id from public.zones where name = 'QUITO NORTE'), 'Feria de joyas y activación de marca', '2026-07-25', '2026-07-30', 'Coordinar con jefe zonal para logística de stand.', 'scheduled'),
  ((select id from public.zones where name = 'MACHALA'), 'Mantenimiento preventivo de rompetráficos', '2026-08-05', '2026-08-10', null, 'scheduled'),
  ((select id from public.zones where name = 'ESMERALDAS'), 'Capacitación y pintura de fachada', '2026-07-20', '2026-07-22', 'Reprogramar para el siguiente trimestre.', 'cancelled'),
  ((select id from public.zones where name = 'PORTOVIEJO'), 'Feria de joyas y activación', '2026-07-28', '2026-07-30', null, 'scheduled'),
  ((select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Mantenimiento de fachadas', '2026-07-16', '2026-07-19', null, 'scheduled'),
  ((select id from public.zones where name = 'AMBATO'), 'Entrega de material POP', '2026-08-01', '2026-08-04', null, 'scheduled'),
  ((select id from public.zones where name = 'ZONA NORTE'), 'Capacitación y revisión de activos', '2026-08-10', '2026-08-12', null, 'scheduled'),
  ((select id from public.zones where name = 'QUITO SUR'), 'Entrega de material POP', '2026-08-01', '2026-08-04', null, 'scheduled');

-- Activos publicitarios/promocionales (60 registros: 10 zonas x 6 tipos)
insert into public.assets (asset_type, zone_id, location, responsible_name, status, notes) values
  ('Inflable', (select id from public.zones where name = 'ESMERALDAS'), 'Agencia OROCASH ECUADOR', 'Ivan Dario', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'ESMERALDAS'), 'Agencia OROCASH ECUADOR', 'Ivan Dario', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'ESMERALDAS'), 'Agencia OROCASH ECUADOR', 'Ivan Dario', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'ESMERALDAS'), 'Agencia OROCASH ECUADOR', 'Ivan Dario', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'ESMERALDAS'), 'Agencia OROCASH ECUADOR', 'Ivan Dario', 'good', null),
  ('Parlante', (select id from public.zones where name = 'ESMERALDAS'), 'Agencia OROCASH ECUADOR', 'Ivan Dario', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'ZONA CENTRO'), 'Agencia OROCASH GUAYAQUIL', 'Pablo Hernandez', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'ZONA CENTRO'), 'Agencia OROCASH GUAYAQUIL', 'Pablo Hernandez', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'ZONA CENTRO'), 'Agencia OROCASH GUAYAQUIL', 'Pablo Hernandez', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'ZONA CENTRO'), 'Agencia OROCASH GUAYAQUIL', 'Pablo Hernandez', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'ZONA CENTRO'), 'Agencia OROCASH GUAYAQUIL', 'Pablo Hernandez', 'good', null),
  ('Parlante', (select id from public.zones where name = 'ZONA CENTRO'), 'Agencia OROCASH GUAYAQUIL', 'Pablo Hernandez', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'PORTOVIEJO'), 'Agencia OROCASH JIPIJAPA', 'Efren Londoño', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'PORTOVIEJO'), 'Agencia OROCASH JIPIJAPA', 'Efren Londoño', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'PORTOVIEJO'), 'Agencia OROCASH JIPIJAPA', 'Efren Londoño', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'PORTOVIEJO'), 'Agencia OROCASH JIPIJAPA', 'Efren Londoño', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'PORTOVIEJO'), 'Agencia OROCASH JIPIJAPA', 'Efren Londoño', 'good', null),
  ('Parlante', (select id from public.zones where name = 'PORTOVIEJO'), 'Agencia OROCASH JIPIJAPA', 'Efren Londoño', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'QUITO NORTE'), 'Agencia OROCASH EL CONDADO', 'Jorge Higuita', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'QUITO NORTE'), 'Agencia OROCASH EL CONDADO', 'Jorge Higuita', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'QUITO NORTE'), 'Agencia OROCASH EL CONDADO', 'Jorge Higuita', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'QUITO NORTE'), 'Agencia OROCASH EL CONDADO', 'Jorge Higuita', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'QUITO NORTE'), 'Agencia OROCASH EL CONDADO', 'Jorge Higuita', 'good', null),
  ('Parlante', (select id from public.zones where name = 'QUITO NORTE'), 'Agencia OROCASH EL CONDADO', 'Jorge Higuita', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Agencia OROCASH EL EMPALME', 'Alfredo Segura', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Agencia OROCASH EL EMPALME', 'Alfredo Segura', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Agencia OROCASH EL EMPALME', 'Alfredo Segura', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Agencia OROCASH EL EMPALME', 'Alfredo Segura', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Agencia OROCASH EL EMPALME', 'Alfredo Segura', 'good', null),
  ('Parlante', (select id from public.zones where name = 'ZONA CENTRO NORTE'), 'Agencia OROCASH EL EMPALME', 'Alfredo Segura', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'AMBATO'), 'Agencia OROCASH EL COCA', 'Wilmar Sanchez', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'AMBATO'), 'Agencia OROCASH EL COCA', 'Wilmar Sanchez', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'AMBATO'), 'Agencia OROCASH EL COCA', 'Wilmar Sanchez', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'AMBATO'), 'Agencia OROCASH EL COCA', 'Wilmar Sanchez', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'AMBATO'), 'Agencia OROCASH EL COCA', 'Wilmar Sanchez', 'good', null),
  ('Parlante', (select id from public.zones where name = 'AMBATO'), 'Agencia OROCASH EL COCA', 'Wilmar Sanchez', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'MACHALA'), 'Agencia OROCASH HUAQUILLAS', 'Atilio Manzano', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'MACHALA'), 'Agencia OROCASH HUAQUILLAS', 'Atilio Manzano', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'MACHALA'), 'Agencia OROCASH HUAQUILLAS', 'Atilio Manzano', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'MACHALA'), 'Agencia OROCASH HUAQUILLAS', 'Atilio Manzano', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'MACHALA'), 'Agencia OROCASH HUAQUILLAS', 'Atilio Manzano', 'good', null),
  ('Parlante', (select id from public.zones where name = 'MACHALA'), 'Agencia OROCASH HUAQUILLAS', 'Atilio Manzano', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'ZONA NORTE'), 'Agencia OROCASH LA FE', 'Harold Bedoya', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'ZONA NORTE'), 'Agencia OROCASH LA FE', 'Harold Bedoya', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'ZONA NORTE'), 'Agencia OROCASH LA FE', 'Harold Bedoya', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'ZONA NORTE'), 'Agencia OROCASH LA FE', 'Harold Bedoya', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'ZONA NORTE'), 'Agencia OROCASH LA FE', 'Harold Bedoya', 'good', null),
  ('Parlante', (select id from public.zones where name = 'ZONA NORTE'), 'Agencia OROCASH LA FE', 'Harold Bedoya', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'ZONA SUR'), 'Agencia OROCASH LA FLORESTA', 'Oswaldo Rincon', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'ZONA SUR'), 'Agencia OROCASH LA FLORESTA', 'Oswaldo Rincon', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'ZONA SUR'), 'Agencia OROCASH LA FLORESTA', 'Oswaldo Rincon', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'ZONA SUR'), 'Agencia OROCASH LA FLORESTA', 'Oswaldo Rincon', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'ZONA SUR'), 'Agencia OROCASH LA FLORESTA', 'Oswaldo Rincon', 'good', null),
  ('Parlante', (select id from public.zones where name = 'ZONA SUR'), 'Agencia OROCASH LA FLORESTA', 'Oswaldo Rincon', 'damaged', 'Requiere reparación, reportado por la agencia.'),
  ('Inflable', (select id from public.zones where name = 'QUITO SUR'), 'Agencia OROCASH SANGOLQUI', 'Jefferson Luna', 'good', null),
  ('Banner Human', (select id from public.zones where name = 'QUITO SUR'), 'Agencia OROCASH SANGOLQUI', 'Jefferson Luna', 'good', null),
  ('Bicicleta Publicitaria', (select id from public.zones where name = 'QUITO SUR'), 'Agencia OROCASH SANGOLQUI', 'Jefferson Luna', 'good', null),
  ('Lona Rompetráfico', (select id from public.zones where name = 'QUITO SUR'), 'Agencia OROCASH SANGOLQUI', 'Jefferson Luna', 'maintenance', 'En mantenimiento preventivo programado.'),
  ('Mano y Anillo', (select id from public.zones where name = 'QUITO SUR'), 'Agencia OROCASH SANGOLQUI', 'Jefferson Luna', 'good', null),
  ('Parlante', (select id from public.zones where name = 'QUITO SUR'), 'Agencia OROCASH SANGOLQUI', 'Jefferson Luna', 'damaged', 'Requiere reparación, reportado por la agencia.');

-- Proveedores de la empresa
insert into public.suppliers (name, contact_name, email, phone, address, category, status, notes) values
  ('Andigráfic S.A.', 'Mónica Peralta', 'ventas@andigrafic.ec', '02-299-0011', 'Av. Amazonas N34-120, Quito', 'Impresión', 'active', 'Proveedor principal de material impreso (volantes, dípticos, sobres).'),
  ('Publi Rótulos Ecuador', 'Diego Salazar', 'contacto@publirotulos.ec', '04-268-4521', 'Km 5.5 vía Daule, Guayaquil', 'Publicidad', 'active', 'Banners, lonas y rótulos exteriores.'),
  ('Inflables del Pacífico', 'Lorena Vera', 'info@inflablespacifico.com', '04-220-7788', 'Cdla. Kennedy, Guayaquil', 'Publicidad', 'active', 'Fabricación y mantenimiento de inflables promocionales.'),
  ('Transportes Rápido Nacional', 'Fernando Ochoa', 'logistica@rapidonacional.ec', '02-380-1122', 'Av. Panamericana Norte km 12, Quito', 'Logística', 'active', 'Distribución de material POP a agencias a nivel nacional.'),
  ('MetalArte Publicitario', 'Cristina Nájera', 'ventas@metalarte.ec', '07-257-3390', 'Vía a Loja, Machala', 'Material POP', 'active', 'Estructuras metálicas, manos y anillos publicitarios.'),
  ('Sonido & Eventos Cía. Ltda.', 'Ricardo Palma', 'info@sonidoeventos.ec', '02-244-6789', 'Sector La Carolina, Quito', 'Tecnología', 'active', 'Parlantes y equipos de sonido para eventos.'),
  ('Talleres La Bicicleta', 'Wilson Chávez', 'taller@labicicleta.ec', '03-272-4410', 'Av. Cevallos, Ambato', 'Mantenimiento', 'active', 'Mantenimiento de bicicletas publicitarias.'),
  ('Papelería Industrial del Norte', 'Karina Suárez', 'ventas@papelnorte.ec', '06-292-1145', 'Ibarra centro', 'Material POP', 'inactive', 'Proveedor anterior de tarjetas y certificados, en revisión de contrato.');

-- Gastos del año (referencian proveedor y zona por nombre cuando aplica)
insert into public.expenses (expense_date, category, description, amount, supplier_id, zone_id, notes) values
  ('2026-01-12', 'material_pop', 'Compra de volantes y dípticos - lote enero', 1850.0, (select id from public.suppliers where name = 'Andigráfic S.A.'), null, null),
  ('2026-01-20', 'logistica', 'Transporte de material POP a agencias Zona Norte', 420.5, (select id from public.suppliers where name = 'Transportes Rápido Nacional'), (select id from public.zones where name = 'ZONA NORTE'), null),
  ('2026-02-03', 'camion', 'Mantenimiento preventivo del camión de la empresa', 680.0, null, null, 'Cambio de aceite y revisión de frenos.'),
  ('2026-02-14', 'material_pop', 'Producción de banners human para campaña San Valentín', 1200.0, (select id from public.suppliers where name = 'Publi Rótulos Ecuador'), null, null),
  ('2026-02-25', 'mantenimiento', 'Reparación de bicicleta publicitaria - Ambato', 150.0, (select id from public.suppliers where name = 'Talleres La Bicicleta'), (select id from public.zones where name = 'AMBATO'), null),
  ('2026-03-05', 'proveedores', 'Pago anticipo estructuras metálicas Q1', 2300.0, (select id from public.suppliers where name = 'MetalArte Publicitario'), null, null),
  ('2026-03-18', 'personal', 'Viáticos jefes zonales - gira de supervisión', 960.0, null, null, null),
  ('2026-03-27', 'logistica', 'Envío urgente de material a Zona Sur', 310.75, (select id from public.suppliers where name = 'Transportes Rápido Nacional'), (select id from public.zones where name = 'ZONA SUR'), null),
  ('2026-04-02', 'material_pop', 'Reimpresión de sobres para contratos', 540.0, (select id from public.suppliers where name = 'Andigráfic S.A.'), null, null),
  ('2026-04-15', 'camion', 'Combustible y peajes - recorrido nacional del camión', 890.2, null, null, null),
  ('2026-04-28', 'otros', 'Compra de insumos de oficina para bodega central', 180.0, null, null, null),
  ('2026-05-06', 'mantenimiento', 'Reparación de parlante dañado - Esmeraldas', 95.0, (select id from public.suppliers where name = 'Sonido & Eventos Cía. Ltda.'), (select id from public.zones where name = 'ESMERALDAS'), null),
  ('2026-05-19', 'material_pop', 'Fabricación de lonas rompetráfico - lote mayo', 1420.0, (select id from public.suppliers where name = 'Publi Rótulos Ecuador'), null, null),
  ('2026-05-30', 'proveedores', 'Pago mensual mantenimiento bicicletas publicitarias', 300.0, (select id from public.suppliers where name = 'Talleres La Bicicleta'), null, null),
  ('2026-06-09', 'personal', 'Capacitación anual a jefes zonales', 1500.0, null, null, null),
  ('2026-06-21', 'logistica', 'Distribución de material POP - Zona Centro Norte', 275.3, (select id from public.suppliers where name = 'Transportes Rápido Nacional'), (select id from public.zones where name = 'ZONA CENTRO NORTE'), null),
  ('2026-07-02', 'camion', 'Seguro anual del camión de la empresa', 2100.0, null, null, null),
  ('2026-07-10', 'material_pop', 'Compra de acrílicos y habladores', 610.0, (select id from public.suppliers where name = 'Andigráfic S.A.'), null, null);
