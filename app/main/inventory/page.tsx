import { createClient } from '@/utils/supabase/server'
import Inventory from "./inventory";

export default async function InventoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
  const { data: stores } = await supabase.from('stores').select('*')
  return <Inventory user={profile} stores={stores} />;
}
