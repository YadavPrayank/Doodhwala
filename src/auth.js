import { supabase } from './supabase';

const TABLES = {
  owner: 'owners',
  worker: 'workers',
  customer: 'customers',
};

export async function checkAndLogin(phone, role) {
  const table = TABLES[role];

  // Check if this number exists in a DIFFERENT role table
  for (const [r, t] of Object.entries(TABLES)) {
    if (r === role) continue;
    const { data } = await supabase
      .from(t)
      .select('id, is_logged_in')
      .eq('phone', phone)
      .maybeSingle();

    if (data) {
      return {
        success: false,
        error: `This number is already registered as a ${r}. Please use the ${r} login instead.`,
      };
    }
  }

  // Check if this number exists in the correct role table
  const { data: user } = await supabase
    .from(table)
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (user) {
    // Check if already logged in on another device
    if (user.is_logged_in) {
      return {
        success: false,
        error: `This number is already logged in on another device. Please log out from that device first.`,
      };
    }

    // Mark as logged in
    await supabase.from(table).update({ is_logged_in: true }).eq('id', user.id);

    // Log activity
    await supabase.from('activity_log').insert({
      shop_code: user.shop_code,
      role,
      name: user.name,
      phone,
      action: 'login',
    });

    return { success: true, user: { ...user, is_logged_in: true }, isNew: false };
  }

  // Number not found — new user
  return { success: true, user: null, isNew: true };
}

export async function logoutUser(phone, role) {
  const table = TABLES[role];
  const { data: user } = await supabase
    .from(table)
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (user) {
    await supabase.from(table).update({ is_logged_in: false }).eq('id', user.id);
    await supabase.from('activity_log').insert({
      shop_code: user.shop_code,
      role,
      name: user.name,
      phone,
      action: 'logout',
    });
  }

  localStorage.clear();
}

export async function registerUser(phone, role, shopCode, details) {
  const table = TABLES[role];

  // Check number not registered anywhere
  for (const [r, t] of Object.entries(TABLES)) {
    const { data } = await supabase.from(t).select('id').eq('phone', phone).maybeSingle();
    if (data) {
      return {
        success: false,
        error: `This number is already registered as a ${r}. Use the ${r} login instead.`,
      };
    }
  }

  const insertData = {
    phone,
    shop_code: shopCode,
    is_logged_in: true,
    verified: true,
    ...details,
  };

  if (role === 'customer') {
    insertData.balance = 0;
    insertData.total_assigned = 0;
    insertData.is_new = true;
  }

  const { data, error } = await supabase.from(table).insert(insertData).select().single();
  if (error) return { success: false, error: 'Something went wrong. Try again.' };

  // Notify owner
  await supabase.from('notifications').insert({
    shop_code: shopCode,
    target_role: 'owner',
    title: `New ${role} joined`,
    body: `${details.name} joined using your shop code`,
  });

  // Log activity
  await supabase.from('activity_log').insert({
    shop_code: shopCode,
    role,
    name: details.name,
    phone,
    action: 'registered',
  });

  return { success: true, user: data };
}