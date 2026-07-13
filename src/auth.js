import { supabase } from './supabase';

const TABLES = {
  owner: 'owners',
  worker: 'workers',
  customer: 'customers',
};

export async function checkAndLogin(email, role) {
  const table = TABLES[role];
  const normalizedEmail = email.trim().toLowerCase();

  // Check if email exists in a different role table
  for (const [r, t] of Object.entries(TABLES)) {
    if (r === role) continue;
    const { data } = await supabase
      .from(t)
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (data) {
      return {
        success: false,
        error: `This email is already registered as a ${r}. Please use the ${r} login instead.`,
      };
    }
  }

  // Check if email exists in correct role table
  const { data: user } = await supabase
    .from(table)
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (user) {
    // Check if already logged in on another device
    if (user.is_logged_in) {
      return {
        success: false,
        error: `This email is already logged in on another device. Please log out from that device first.`,
      };
    }

    // Send OTP email
   const { error: otpError } = await supabase.auth.signInWithOtp({
  email: normalizedEmail,
  options: {
    shouldCreateUser: false,
    emailRedirectTo: null,
  }
});
    if (otpError) {
      return { success: false, error: 'Failed to send OTP. Try again.' };
    }

    return { success: true, user, isNew: false };
  }

  // Email not found — new user
  return { success: true, user: null, isNew: true };
}

export async function verifyOtp(email, token, role) {
  const normalizedEmail = email.trim().toLowerCase();
  const table = TABLES[role];

  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: 'email',
  });

  if (error) {
    return { success: false, error: 'Wrong code. Try again.' };
  }

  // Mark as logged in
  const { data: user } = await supabase
    .from(table)
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (user) {
    await supabase.from(table).update({ is_logged_in: true }).eq('id', user.id);
    await supabase.from('activity_log').insert({
      shop_code: user.shop_code,
      role,
      name: user.name,
      phone: normalizedEmail,
      action: 'login',
    });
    return { success: true, user };
  }

  return { success: false, error: 'Something went wrong. Try again.' };
}

export async function sendRegistrationOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
  email: email.trim().toLowerCase(),
  options: {
    shouldCreateUser: false,
    emailRedirectTo: null,
  }
});
  if (error) return { success: false, error: 'Failed to send OTP. Try again.' };
  return { success: true };
}

export async function registerUser(email, role, shopCode, details) {
  const table = TABLES[role];
  const normalizedEmail = email.trim().toLowerCase();

  // Check email not registered anywhere
  for (const [r, t] of Object.entries(TABLES)) {
    const { data } = await supabase.from(t).select('id').eq('email', normalizedEmail).maybeSingle();
    if (data) {
      return {
        success: false,
        error: `This email is already registered as a ${r}. Use the ${r} login instead.`,
      };
    }
  }

  const insertData = {
    email: normalizedEmail,
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

  await supabase.from('notifications').insert({
    shop_code: shopCode,
    target_role: 'owner',
    title: `New ${role} joined`,
    body: `${details.name} joined using your shop code`,
  });

  await supabase.from('activity_log').insert({
    shop_code: shopCode,
    role,
    name: details.name,
    phone: normalizedEmail,
    action: 'registered',
  });

  return { success: true, user: data };
}

export async function logoutUser(email, role) {
  const table = TABLES[role];
  const { data: user } = await supabase
    .from(table)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (user) {
    await supabase.from(table).update({ is_logged_in: false }).eq('id', user.id);
    await supabase.from('activity_log').insert({
      shop_code: user.shop_code,
      role,
      name: user.name,
      phone: email,
      action: 'logout',
    });
  }

  localStorage.clear();
}