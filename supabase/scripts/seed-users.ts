/**
 * Crea el usuario administrador y los 10 jefes zonales reales de Orocash
 * usando el API de administración de Supabase Auth (requiere
 * SUPABASE_SERVICE_ROLE_KEY). Los nombres y zonas provienen del archivo
 * "agencias y zonales.xlsx" y deben coincidir exactamente con los nombres
 * de zona sembrados en 03_seed.sql.
 *
 * Uso:
 *   npx tsx supabase/scripts/seed-users.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Jefes zonales reales — nombre completo, zona (debe coincidir con zones.name
// en 03_seed.sql) y usuario/correo de acceso al sistema.
const ZONAL_MANAGERS: { fullName: string; zoneName: string; username: string }[] = [
  { fullName: 'Ivan Dario', zoneName: 'ESMERALDAS', username: 'ivan.dario' },
  { fullName: 'Pablo Hernandez', zoneName: 'ZONA CENTRO', username: 'pablo.hernandez' },
  { fullName: 'Efren Londoño', zoneName: 'PORTOVIEJO', username: 'efren.londono' },
  { fullName: 'Jorge Higuita', zoneName: 'QUITO NORTE', username: 'jorge.higuita' },
  { fullName: 'Alfredo Segura', zoneName: 'ZONA CENTRO NORTE', username: 'alfredo.segura' },
  { fullName: 'Wilmar Sanchez', zoneName: 'AMBATO', username: 'wilmar.sanchez' },
  { fullName: 'Atilio Manzano', zoneName: 'MACHALA', username: 'atilio.manzano' },
  { fullName: 'Harold Bedoya', zoneName: 'ZONA NORTE', username: 'harold.bedoya' },
  { fullName: 'Oswaldo Rincon', zoneName: 'ZONA SUR', username: 'oswaldo.rincon' },
  { fullName: 'Jefferson Luna', zoneName: 'QUITO SUR', username: 'jefferson.luna' }
];

const TEMP_PASSWORD = 'CambiarEnProduccion123!';

async function main() {
  const { data: zones, error: zonesError } = await admin.from('zones').select('id, name');
  if (zonesError || !zones) {
    throw zonesError ?? new Error('No se pudieron leer las zonas. Ejecuta primero 03_seed.sql.');
  }
  const zoneByName = new Map(zones.map((z: any) => [z.name, z.id]));

  // 1. Usuario administrador
  const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
    email: 'admin@orocash.ec',
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Administrador Orocash', username: 'admin', role: 'admin' }
  });
  if (adminError) console.error('Admin:', adminError.message);
  else console.log('Creado admin:', adminUser.user?.email);

  // 2. Los 10 jefes zonales reales
  for (const manager of ZONAL_MANAGERS) {
    const zoneId = zoneByName.get(manager.zoneName);
    if (!zoneId) {
      console.error(`Zona "${manager.zoneName}" no encontrada — revisa 03_seed.sql`);
      continue;
    }

    const email = `${manager.username}@orocash.ec`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: manager.fullName,
        username: manager.username,
        role: 'zonal_manager',
        zone_id: zoneId
      }
    });

    if (error) {
      console.error(`Jefe zonal ${manager.fullName} (${manager.zoneName}):`, error.message);
      continue;
    }

    console.log('Creado jefe zonal:', email, '->', manager.zoneName);

    // Vincula al jefe zonal como manager de su zona y de todas sus agencias
    await admin.from('zones').update({ manager_id: data.user!.id }).eq('id', zoneId);
    await admin.from('stores').update({ zonal_manager_id: data.user!.id }).eq('zone_id', zoneId);
  }

  console.log(`Listo. Todas las contraseñas temporales: ${TEMP_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
