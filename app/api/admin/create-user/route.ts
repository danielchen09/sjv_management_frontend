import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "sjemployee123";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, store_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Unable to load current user profile." }, { status: 403 });
  }

  const { first_name, last_name, email, role, store_id } = await request.json();

  if (!first_name || !last_name || !email || !role) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const requestedStoreId = store_id ? String(store_id) : undefined;

  const isAdmin = profile.role === "admin";
  const isManager = profile.role === "manager";

  if (!isAdmin && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedRoles = isAdmin ? ["admin", "manager", "chef", "staff"] : ["chef", "staff"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "You are not allowed to create that role." }, { status: 403 });
  }

  const effectiveStoreId = isAdmin ? requestedStoreId : String(profile.store_id ?? "");

  if (!effectiveStoreId) {
    return NextResponse.json({ error: "A store is required for the new user." }, { status: 400 });
  }

  if (isManager && requestedStoreId && String(requestedStoreId) !== String(profile.store_id ?? "")) {
    return NextResponse.json({ error: "Managers may only create users for their own store." }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: "Service role configuration missing." }, { status: 500 });
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: trimmedEmail,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name,
      last_name,
      role,
      store_id: effectiveStoreId,
    },
  });

  if (createError || !createdUser?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user." },
      { status: 400 }
    );
  }

  const { error: profileUpsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: createdUser.user.id,
      email: trimmedEmail,
      first_name,
      last_name,
      role,
      store_id: effectiveStoreId,
    },
    { onConflict: "id" }
  );

  if (profileUpsertError) {
    return NextResponse.json(
      { error: profileUpsertError.message ?? "User created but profile setup failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ user: createdUser.user }, { status: 201 });
}
